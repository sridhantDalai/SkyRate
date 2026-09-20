from typing import List, Optional
from fastapi import APIRouter, HTTPException, Query, status, Path
from app.services.index_service import IndexService
from app.schemas.index import (
    IndexOverview, StateIndexComparison,
    IndexHistoryItem, IndexCompareResponse,
    LatestIndexResponse, IndexFilterParams
)
from app.schemas.common import ResponseEnvelope, STANDARD_ERROR_RESPONSES

router = APIRouter(prefix="/indexes", tags=["Index"])

@router.get(
    "/latest",
    response_model=ResponseEnvelope[LatestIndexResponse],
    summary="Retrieve Latest Air Passenger Price Index (APIx)",
    description=(
        "Retrieves the latest available MoSPI-calibrated Air Passenger Price Index (APIx) values from the most "
        "recent index partition in Supabase. Supports granular filtering across Indian States (or 'All India'), "
        "aviation corridors (e.g. DEL-BOM), commercial carriers, and booking horizons (T, T+1, T+7, T+15, T+30, T+45). "
        "Provides Laspeyres price metrics relative to the calibrated base period."
    ),
    responses={
        200: {"description": "Paginated list of econometric APIx index records."},
        404: STANDARD_ERROR_RESPONSES[404],
        422: STANDARD_ERROR_RESPONSES[422],
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_latest_index(
    state: Optional[str] = Query(None, description="Filter by Indian origin state or 'All India' (e.g. Delhi, Maharashtra, All India)", examples=["Delhi"]),
    route: Optional[str] = Query(None, description="Filter by route corridor (e.g. DEL-BOM), mapped dynamically to origin state", examples=["DEL-BOM"]),
    carrier: Optional[str] = Query(None, description="Optional airline carrier filter (note: macro index aggregates across carriers)", examples=["IndiGo"]),
    horizon: Optional[str] = Query(None, description="Filter by advance-purchase horizon (T, T+1, T+7, T+15, T+30, T+45)", examples=["T+1"]),
    limit: int = Query(50, ge=1, le=200, description="Maximum index records to return per page", examples=[50]),
    offset: int = Query(0, ge=0, le=5000, description="Zero-indexed pagination offset (maximum: 5000)", examples=[0])
):
    params = IndexFilterParams(
        state=state,
        route=route,
        carrier=carrier,
        horizon=horizon,
        limit=limit,
        offset=offset
    )
    result = await IndexService.get_latest_index(params)
    return ResponseEnvelope(
        success=True,
        data=result,
        message=f"Retrieved {len(result.items)} index records for partition {result.partition_date}."
    )

@router.get(
    "/overview",
    response_model=ResponseEnvelope[IndexOverview],
    summary="Macro APIx Index Overview",
    description=(
        "Returns the macro-level Air Passenger Price Index (APIx) overview, containing All-India baseline "
        "aggregates across all lead-time horizons, State breakdown matrices, and partition timestamp metadata."
    ),
    responses={
        200: {"description": "National and state-level macro APIx index overview."},
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_index_overview():
    result = await IndexService.get_overview()
    return ResponseEnvelope(
        success=True,
        data=result,
        message="Retrieved latest MoSPI-calibrated RealTime APIx index overview."
    )

@router.get(
    "/history",
    response_model=ResponseEnvelope[List[IndexHistoryItem]],
    summary="Historical APIx Index Trajectory",
    description=(
        "Retrieves the multi-day historical trajectory of the APIx index for a state or the All-India benchmark "
        "over a lookback window between 1 and 30 days."
    ),
    responses={
        200: {"description": "Daily historical index values with basket inflation tracking."},
        422: STANDARD_ERROR_RESPONSES[422],
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_index_history(
    state: Optional[str] = Query("All India", description="State name or 'All India' benchmark", examples=["All India"]),
    days: int = Query(7, ge=1, le=30, description="Historical lookback window in days (1 to 30)", examples=[7])
):
    history = await IndexService.get_index_history(state=state, days=days)
    return ResponseEnvelope(
        success=True,
        data=history,
        message=f"Historical index trajectory for {state} retrieved."
    )

@router.get(
    "/compare",
    response_model=ResponseEnvelope[IndexCompareResponse],
    summary="State vs National Index Comparison",
    description=(
        "Generates cross-sectional comparative index table evaluating state-level airfare price inflation "
        "relative to the All-India national benchmark across active monitoring corridors."
    ),
    responses={
        200: {"description": "Cross-sectional state comparison against All-India benchmark."},
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def compare_indexes():
    result = await IndexService.compare_indexes()
    return ResponseEnvelope(
        success=True,
        data=result,
        message="Cross-state APIx inflation comparison generated."
    )

@router.get(
    "/state/{state_name}",
    response_model=ResponseEnvelope[StateIndexComparison],
    summary="State-Specific APIx Index",
    description="Retrieves current APIx metrics, booking horizon breakdowns, and baseline inflation for a specific Indian State.",
    responses={
        200: {"description": "Detailed index data and advance purchase breakdown for the requested state."},
        404: STANDARD_ERROR_RESPONSES[404],
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_state_index(
    state_name: str = Path(..., description="Indian State name (e.g. Delhi, Maharashtra, Karnataka)", examples=["Delhi"])
):
    result = await IndexService.get_state_index(state_name)
    if not result:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Index data for state '{state_name}' not found."
        )
    return ResponseEnvelope(
        success=True,
        data=result,
        message=f"Retrieved index data for state {state_name}."
    )
