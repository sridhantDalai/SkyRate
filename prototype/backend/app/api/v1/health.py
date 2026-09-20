import secrets
from typing import Optional
from fastapi import APIRouter, HTTPException, Header, status
from app.db.supabase import SupabaseManager
from app.schemas.common import HealthResponse, STANDARD_ERROR_RESPONSES
from app.core.cache import cache
from app.core.config import settings
from app.core.logging import logger

router = APIRouter(tags=["Health"])


@router.get(
    "/health",
    response_model=HealthResponse,
    summary="System Health & Connectivity Check",
    description="Actively verifies service liveness and queries Supabase PostgreSQL to confirm database connectivity.",
    responses={
        200: {
            "description": "System health and database connectivity report",
            "content": {
                "application/json": {
                    "example": {
                        "status": "ok",
                        "service": "skyrate-backend",
                        "database": "connected"
                    }
                }
            }
        },
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def check_health():
    try:
        db_status = await SupabaseManager.check_database_connectivity()
    except Exception:
        db_status = "disconnected"
    return HealthResponse(
        status="ok",
        service="skyrate-backend",
        database=db_status
    )


@router.get(
    "/health/cache",
    summary="Cache Diagnostics",
    description=(
        "Returns in-process TTL cache statistics: live entry count, total hits/misses, "
        "and hit-rate percentage. Useful for validating caching behaviour in development."
    ),
    tags=["Health"],
)
async def cache_stats():
    """Expose cache hit/miss/size metrics for observability."""
    return {"cache": cache.stats()}


@router.post(
    "/health/cache/clear",
    summary="Flush In-Process Cache",
    description=(
        "Evicts all in-process cache entries immediately. "
        "Protected administrative endpoint: requires authentication via X-Admin-Secret header. "
        "Strictly prohibited in production unless configured with an ADMIN_SECRET environment variable."
    ),
    tags=["Health"],
    responses={
        200: {
            "description": "Cache successfully cleared.",
            "content": {
                "application/json": {
                    "example": {
                        "cleared_entries": 5,
                        "status": "cache flushed"
                    }
                }
            }
        },
        401: STANDARD_ERROR_RESPONSES[401],
        403: STANDARD_ERROR_RESPONSES[403],
    }
)
async def clear_cache(
    x_admin_secret: Optional[str] = Header(None, alias="X-Admin-Secret", description="Administrative authorization secret token required to flush cache in production."),
    authorization: Optional[str] = Header(None, alias="Authorization"),
):
    """Flush the entire in-process cache with administrative authorization checks."""
    # Check if cache clear is disabled entirely
    if not getattr(settings, "ENABLE_CACHE_CLEAR_ENDPOINT", True):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cache clear endpoint is disabled."
        )

    # Extract candidate token from X-Admin-Secret or Bearer Authorization
    candidate: Optional[str] = None
    if x_admin_secret:
        candidate = x_admin_secret.strip()
    elif authorization:
        if authorization.startswith("Bearer "):
            candidate = authorization[7:].strip()
        else:
            candidate = authorization.strip()

    is_prod = (settings.API_ENV or settings.ENVIRONMENT or "development").lower() == "production"
    configured_secret = getattr(settings, "ADMIN_SECRET", None)

    if is_prod:
        # Production guard: endpoint MUST NOT be publicly executable
        if not configured_secret:
            logger.error("POST /api/v1/health/cache/clear rejected: No ADMIN_SECRET configured in production.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Cache clear endpoint is disabled in production without configured administrative credentials."
            )

        if not candidate:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Administrative credentials required via X-Admin-Secret header."
            )

        if not secrets.compare_digest(candidate, configured_secret):
            logger.warning("POST /api/v1/health/cache/clear rejected: Invalid administrative credentials.")
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Invalid administrative credentials."
            )
    else:
        # Development / Testing guard:
        if configured_secret:
            if not candidate:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Administrative credentials required via X-Admin-Secret header."
                )
            if not secrets.compare_digest(candidate, configured_secret):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid administrative credentials."
                )

    before = cache.stats()["live_entries"]
    cache.clear()
    return {"cleared_entries": before, "status": "cache flushed"}
