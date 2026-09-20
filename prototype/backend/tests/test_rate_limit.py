import time
import pytest
from starlette.requests import Request
from app.core.config import settings
from app.core.rate_limit import (
    SlidingWindowRateLimiter,
    limiter,
    get_client_identifier,
)


@pytest.fixture(autouse=True)
def reset_limiter_state():
    """Ensure clean rate limiter state before and after each test."""
    limiter.reset()
    original_enabled = settings.RATE_LIMIT_ENABLED
    original_prod = settings.RATE_LIMIT_PROD_PER_MINUTE
    original_dev = settings.RATE_LIMIT_DEV_PER_MINUTE
    original_override = settings.RATE_LIMIT_PER_MINUTE
    original_window = settings.RATE_LIMIT_WINDOW_SECONDS
    original_trust = settings.TRUST_PROXY_HEADERS
    original_env = settings.API_ENV

    yield

    limiter.reset()
    settings.RATE_LIMIT_ENABLED = original_enabled
    settings.RATE_LIMIT_PROD_PER_MINUTE = original_prod
    settings.RATE_LIMIT_DEV_PER_MINUTE = original_dev
    settings.RATE_LIMIT_PER_MINUTE = original_override
    settings.RATE_LIMIT_WINDOW_SECONDS = original_window
    settings.TRUST_PROXY_HEADERS = original_trust
    settings.API_ENV = original_env


def test_sliding_window_rate_limiter_unit():
    """Direct unit test of SlidingWindowRateLimiter logic."""
    unit_limiter = SlidingWindowRateLimiter()
    key = "192.168.1.100"
    limit = 3
    window = 10

    # 1st request
    allowed, remaining, reset_sec, retry_after = unit_limiter.check_rate_limit(key, limit, window)
    assert allowed is True
    assert remaining == 2
    assert retry_after == 0

    # 2nd request
    allowed, remaining, reset_sec, retry_after = unit_limiter.check_rate_limit(key, limit, window)
    assert allowed is True
    assert remaining == 1

    # 3rd request (hits limit)
    allowed, remaining, reset_sec, retry_after = unit_limiter.check_rate_limit(key, limit, window)
    assert allowed is True
    assert remaining == 0

    # 4th request (exceeds limit)
    allowed, remaining, reset_sec, retry_after = unit_limiter.check_rate_limit(key, limit, window)
    assert allowed is False
    assert remaining == 0
    assert retry_after >= 1

    # Reset clears state
    unit_limiter.reset()
    allowed, remaining, _, _ = unit_limiter.check_rate_limit(key, limit, window)
    assert allowed is True
    assert remaining == 2


def test_allowed_requests_have_rate_limit_headers(client):
    """Allowed requests must include standard X-RateLimit headers and decrement quota."""
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_PER_MINUTE = 10
    settings.RATE_LIMIT_WINDOW_SECONDS = 60

    response1 = client.get("/api/v1/indexes/overview")
    assert response1.status_code == 200
    assert "X-RateLimit-Limit" in response1.headers
    assert response1.headers["X-RateLimit-Limit"] == "10"
    assert response1.headers["X-RateLimit-Remaining"] == "9"
    assert "X-RateLimit-Reset" in response1.headers

    response2 = client.get("/api/v1/indexes/overview")
    assert response2.status_code == 200
    assert response2.headers["X-RateLimit-Remaining"] == "8"


def test_exceeded_requests_return_429_and_retry_after(client):
    """When limit is exceeded, return HTTP 429, Retry-After header, and standard error contract."""
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_PER_MINUTE = 3
    settings.RATE_LIMIT_WINDOW_SECONDS = 60

    # Make 3 allowed requests
    for i in range(3):
        res = client.get("/api/v1/indexes/overview")
        assert res.status_code == 200, f"Request {i+1} should succeed"

    # 4th request must be rejected with 429
    res_exceeded = client.get("/api/v1/indexes/overview")
    assert res_exceeded.status_code == 429
    assert "Retry-After" in res_exceeded.headers
    assert int(res_exceeded.headers["Retry-After"]) >= 1
    assert res_exceeded.headers["X-RateLimit-Remaining"] == "0"
    assert res_exceeded.headers["X-RateLimit-Limit"] == "3"

    # Verify SkyRate standard error envelope contract
    data = res_exceeded.json()
    assert data["success"] is False
    assert "error" in data
    assert data["error"]["code"] == "RATE_LIMIT_EXCEEDED"
    assert "Rate limit exceeded" in data["error"]["message"]
    assert data["error"]["details"]["limit"] == 3
    assert data["error"]["details"]["window_seconds"] == 60
    assert data["error"]["details"]["retry_after"] >= 1


def test_health_check_exempt_from_rate_limit(client):
    """Health probes must not be blocked even if non-exempt endpoints hit rate limits."""
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_PER_MINUTE = 2
    settings.RATE_LIMIT_WINDOW_SECONDS = 60

    # Exhaust limit on API endpoints
    client.get("/api/v1/indexes/overview")
    client.get("/api/v1/indexes/overview")
    blocked = client.get("/api/v1/indexes/overview")
    assert blocked.status_code == 429

    # Health endpoints remain accessible
    health_res = client.get("/api/v1/health")
    assert health_res.status_code == 200

    cache_health_res = client.get("/api/v1/health/cache")
    assert cache_health_res.status_code == 200


def test_reverse_proxy_spoofing_defense(client):
    """
    By default, TRUST_PROXY_HEADERS is False.
    Arbitrary X-Forwarded-For headers MUST NOT allow a client to evade rate limits.
    """
    settings.RATE_LIMIT_ENABLED = True
    settings.RATE_LIMIT_PER_MINUTE = 2
    settings.TRUST_PROXY_HEADERS = False

    # Request 1 with spoofed header A
    r1 = client.get("/api/v1/indexes/overview", headers={"X-Forwarded-For": "1.1.1.1"})
    assert r1.status_code == 200

    # Request 2 with spoofed header B
    r2 = client.get("/api/v1/indexes/overview", headers={"X-Forwarded-For": "2.2.2.2"})
    assert r2.status_code == 200

    # Request 3 with spoofed header C must still be blocked (bound to socket host)
    r3 = client.get("/api/v1/indexes/overview", headers={"X-Forwarded-For": "3.3.3.3"})
    assert r3.status_code == 429


def test_trusted_proxy_enabled():
    """
    When TRUST_PROXY_HEADERS is True, client IP is safely parsed from proxy headers.
    """
    scope = {
        "type": "http",
        "headers": [(b"x-forwarded-for", b"203.0.113.195, 70.41.3.18")],
        "client": ("127.0.0.1", 54321),
    }
    req = Request(scope)

    # When trust is True, resolves first forwarded IP
    ip_trusted = get_client_identifier(req, trust_proxy_headers=True)
    assert ip_trusted == "203.0.113.195"

    # When trust is False, resolves direct socket host
    ip_untrusted = get_client_identifier(req, trust_proxy_headers=False)
    assert ip_untrusted == "127.0.0.1"


def test_environment_configuration_tiers():
    """Verify production vs development rate limit resolution."""
    settings.RATE_LIMIT_PER_MINUTE = None

    # Production environment
    settings.API_ENV = "production"
    assert settings.get_rate_limit() == 60

    # Development environment
    settings.API_ENV = "development"
    assert settings.get_rate_limit() == 1000

    # Explicit override takes precedence
    settings.RATE_LIMIT_PER_MINUTE = 250
    assert settings.get_rate_limit() == 250


def test_rate_limiting_can_be_disabled(client):
    """When RATE_LIMIT_ENABLED is False, requests bypass limiter completely."""
    settings.RATE_LIMIT_ENABLED = False
    settings.RATE_LIMIT_PER_MINUTE = 1

    r1 = client.get("/api/v1/indexes/overview")
    r2 = client.get("/api/v1/indexes/overview")
    r3 = client.get("/api/v1/indexes/overview")

    assert r1.status_code == 200
    assert r2.status_code == 200
    assert r3.status_code == 200
    assert "X-RateLimit-Limit" not in r1.headers
