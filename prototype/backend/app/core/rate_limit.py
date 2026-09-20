"""
SkyRate In-Memory API Rate Limiter
==================================

Lightweight, production-safe, thread-safe application-level rate limiting
for single-instance deployments of SkyRate FastAPI backend.

Architectural Note on Distributed Deployments:
---------------------------------------------
This in-memory implementation uses sliding-window tracking via `collections.deque`
and `threading.Lock`. It is optimized for single-instance or single-worker nodes.
For horizontally scaled, multi-instance, or distributed Kubernetes deployments,
this rate limiting strategy should be backed by a shared, distributed in-memory
store such as Redis (e.g. via Redis sliding-window zset counters or token-bucket)
so that rate limit quotas are enforced atomically across all cluster replicas.
"""

import time
import threading
from collections import deque
from typing import Dict, Tuple, Set, Optional, Any
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.requests import Request
from starlette.responses import Response, JSONResponse
from app.core.config import settings
from app.core.logging import logger
from app.core.exceptions import format_error_response

# Default endpoints that should not be strictly throttled (health, probes, openapi docs)
DEFAULT_EXEMPT_PATHS: Set[str] = {
    "/",
    "/docs",
    "/redoc",
    "/openapi.json",
    "/favicon.ico",
    f"{settings.API_V1_STR}/health",
    f"{settings.API_V1_STR}/health/cache",
    "/health",
    "/api/v1/health",
    "/api/v1/health/cache",
}


class SlidingWindowRateLimiter:
    """
    Thread-safe in-memory sliding-window counter rate limiter.
    Stores timestamps of accepted requests in a deque per client key.
    """

    def __init__(self):
        self._lock = threading.Lock()
        self._records: Dict[str, deque] = {}
        self._request_counter = 0

    def check_rate_limit(
        self,
        key: str,
        limit: int,
        window_seconds: int = 60
    ) -> Tuple[bool, int, int, int]:
        """
        Evaluates whether a request from `key` is permitted.

        Returns:
            Tuple[allowed (bool), remaining (int), reset_seconds (int), retry_after (int)]
        """
        now = time.time()
        cutoff = now - window_seconds

        with self._lock:
            # Periodic cleanup of stale client keys to prevent unbounded memory growth
            self._request_counter += 1
            if self._request_counter % 1000 == 0:
                self._cleanup(cutoff)

            if key not in self._records:
                self._records[key] = deque()

            timestamps = self._records[key]

            # Evict timestamps older than the sliding window
            while timestamps and timestamps[0] <= cutoff:
                timestamps.popleft()

            current_count = len(timestamps)

            if current_count >= limit:
                # Rate limit exceeded
                oldest_ts = timestamps[0]
                retry_after = max(1, int(oldest_ts + window_seconds - now) + 1)
                reset_seconds = retry_after
                return False, 0, reset_seconds, retry_after

            # Request allowed: record current timestamp
            timestamps.append(now)
            remaining = limit - (current_count + 1)
            oldest_ts = timestamps[0]
            reset_seconds = max(1, int(oldest_ts + window_seconds - now))
            return True, remaining, reset_seconds, 0

    def _cleanup(self, cutoff: float) -> None:
        """Evicts client keys that have no activity in the current sliding window."""
        stale_keys = [
            k for k, q in self._records.items()
            if not q or q[-1] <= cutoff
        ]
        for k in stale_keys:
            del self._records[k]

    def reset(self) -> None:
        """Flushes all rate limiting records (useful for test isolation)."""
        with self._lock:
            self._records.clear()
            self._request_counter = 0


# Global singleton limiter instance
limiter = SlidingWindowRateLimiter()


def get_client_identifier(request: Request, trust_proxy_headers: bool = False) -> str:
    """
    Safely resolves client IP for rate limiting.

    Security Guarantee:
    Arbitrary `X-Forwarded-For` or `X-Real-IP` headers are NOT blindly trusted
    unless `TRUST_PROXY_HEADERS` is explicitly configured to True in environment.
    This prevents attackers from spoofing arbitrary IPs to bypass rate limits.
    """
    if trust_proxy_headers:
        # Check X-Forwarded-For (take the first client IP in chain)
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            client_ip = forwarded_for.split(",")[0].strip()
            if client_ip:
                return client_ip

        # Check X-Real-IP
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip.strip()

    # Default / secure fallback: use direct socket client host
    if request.client and request.client.host:
        return request.client.host

    return "unknown-client"


class RateLimitMiddleware(BaseHTTPMiddleware):
    """
    FastAPI / Starlette middleware enforcing configurable sliding-window rate limits.
    Attaches RFC-compliant rate limit headers on responses:
      - X-RateLimit-Limit
      - X-RateLimit-Remaining
      - X-RateLimit-Reset
      - Retry-After (on HTTP 429)
    """

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # 1. Skip if rate limiting is globally disabled
        if not getattr(settings, "RATE_LIMIT_ENABLED", True):
            return await call_next(request)

        # 2. Skip exempt paths (e.g. health checks, docs)
        path = request.url.path.rstrip("/") or "/"
        if path in DEFAULT_EXEMPT_PATHS:
            return await call_next(request)

        # 3. Determine effective rate limit and window
        limit = getattr(settings, "get_rate_limit", lambda: 60)()
        window = getattr(settings, "RATE_LIMIT_WINDOW_SECONDS", 60)
        trust_proxies = getattr(settings, "TRUST_PROXY_HEADERS", False)

        # 4. Extract safe client identifier
        client_id = get_client_identifier(request, trust_proxy_headers=trust_proxies)

        # 5. Check quota
        allowed, remaining, reset_seconds, retry_after = limiter.check_rate_limit(
            key=client_id,
            limit=limit,
            window_seconds=window
        )

        reset_timestamp = int(time.time() + reset_seconds)

        # 6. Reject if limit exceeded
        if not allowed:
            logger.warning(
                f"Rate limit exceeded for client '{client_id}' on {request.method} {request.url.path} "
                f"({limit} req/{window}s, retry_after={retry_after}s)"
            )
            error_content = format_error_response(
                code="RATE_LIMIT_EXCEEDED",
                message=f"Rate limit exceeded. Maximum {limit} requests per {window}s allowed. Try again in {retry_after} seconds.",
                details={
                    "limit": limit,
                    "window_seconds": window,
                    "retry_after": retry_after,
                    "client_ip": client_id,
                }
            )
            headers = {
                "Retry-After": str(retry_after),
                "X-RateLimit-Limit": str(limit),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(reset_timestamp),
            }
            return JSONResponse(
                status_code=429,
                content=error_content,
                headers=headers
            )

        # 7. Process request and attach standard headers to response
        response = await call_next(request)
        response.headers["X-RateLimit-Limit"] = str(limit)
        response.headers["X-RateLimit-Remaining"] = str(remaining)
        response.headers["X-RateLimit-Reset"] = str(reset_timestamp)
        return response
