from fastapi import APIRouter
from app.api.v1 import health, fares, indexes, routes, analytics, metadata

api_router = APIRouter()

api_router.include_router(health.router)
api_router.include_router(fares.router)
api_router.include_router(indexes.router)
api_router.include_router(routes.router)
api_router.include_router(analytics.router)
api_router.include_router(metadata.router)

from app.schemas.analytics import AnalyticsOverview
from app.schemas.common import ResponseEnvelope, STANDARD_ERROR_RESPONSES
from app.services.analytics_service import AnalyticsService

@api_router.get(
    "/summary",
    response_model=ResponseEnvelope[AnalyticsOverview],
    summary="Executive Market Analytics Summary Root Alias",
    description="Root-level alias for executive market summary.",
    tags=["Analytics"],
    responses={
        200: {"description": "Executive summary of national airfare index and market observations."},
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_root_summary():
    data = await AnalyticsService.get_overview()
    return ResponseEnvelope(
        success=True,
        data=data,
        message="Executive airfare analytics summary retrieved."
    )
