from typing import List, Optional
from fastapi import APIRouter, Query, Depends, Path
from app.services.analytics_service import AnalyticsService
from app.schemas.analytics import (
    AnalyticsOverview, TrendPoint, RouteSurgeAnalysis,
    LeadTimeAnalysisResponse, LeadTimeAnalysisParams,
    CarrierAnalyticsResponse, CarrierAnalyticsParams,
    RouteFeeBreakdown, MacroAnalyticsResponse,
    AnalyticsTrendsParams, AnalyticsTrendsResponse
)
from app.schemas.common import ResponseEnvelope, STANDARD_ERROR_RESPONSES

router = APIRouter(prefix="/analytics", tags=["Analytics"])

@router.get(
    "/overview",
    response_model=ResponseEnvelope[AnalyticsOverview],
    summary="Executive Market Analytics Overview",
    description=(
        "Delivers high-level application metrics derived directly from Supabase airfare partitions: "
        "current APIx, previous APIx, percentage change, observed fare observations count, unique routes, "
        "monitored carriers, and min/median/max price benchmarks."
    ),
    responses={
        200: {"description": "Executive summary of national airfare index and market observations."},
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_overview():
    data = await AnalyticsService.get_overview()
    return ResponseEnvelope(
        success=True,
        data=data,
        message="Executive airfare analytics overview retrieved."
    )

@router.get(
    "/summary",
    response_model=ResponseEnvelope[AnalyticsOverview],
    summary="Executive Market Analytics Summary (Contract Alias)",
    description="Alias for /analytics/overview guaranteeing calculation_date field presence.",
    responses={
        200: {"description": "Executive summary of national airfare index and market observations."},
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_summary():
    data = await AnalyticsService.get_overview()
    return ResponseEnvelope(
        success=True,
        data=data,
        message="Executive airfare analytics summary retrieved."
    )


@router.get(
    "/trends",
    response_model=ResponseEnvelope[AnalyticsTrendsResponse],
    summary="Time-Series Airfare Trends",
    description=(
        "Retrieve normalized time-series fare trends suitable for frontend interactive charts. "
        "Supports filtering by route, origin, destination, carrier, horizon, date range, "
        "and aggregation granularity (daily, weekly, monthly)."
    ),
    responses={
        200: {"description": "Normalized time-series trend points for charting."},
        422: STANDARD_ERROR_RESPONSES[422],
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_trends(
    params: AnalyticsTrendsParams = Depends()
):
    data = await AnalyticsService.get_trends(params=params)
    return ResponseEnvelope(
        success=True,
        data=data,
        message=f"Airfare trends for {params.route or 'all routes'} ({params.granularity}) retrieved."
    )

@router.get(
    "/elasticity",
    response_model=ResponseEnvelope[LeadTimeAnalysisResponse],
    summary="Advance-Purchase Lead-Time Fare Behavior",
    description=(
        "Analyzes observed empirical pricing behavior across advance purchase horizons: "
        "T+1, T+7, T+15, T+30, T+45. Derived directly from stored flight fare observations. "
        "Represents non-causal observed advance-purchase price curves."
    ),
    responses={
        200: {"description": "Observed lead-time price curve points across advance purchase horizons."},
        422: STANDARD_ERROR_RESPONSES[422],
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_elasticity(params: LeadTimeAnalysisParams = Depends()):
    data = await AnalyticsService.get_lead_time_behaviour(params=params)
    target = params.route or "all routes"
    return ResponseEnvelope(
        success=True,
        data=data,
        message=f"Observed lead-time fare behaviour for {target} generated."
    )

@router.get(
    "/carriers",
    response_model=ResponseEnvelope[CarrierAnalyticsResponse],
    summary="Objective Carrier Fare Statistics",
    description=(
        "Computes comparable fare statistics per commercial carrier (observations, minimum, median, "
        "average, maximum, available vs sold-out counts). Carriers are presented objectively without ranking as 'best' or 'worst'."
    ),
    responses={
        200: {"description": "Unbiased statistical comparison across airlines."},
        422: STANDARD_ERROR_RESPONSES[422],
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_carriers_analytics(params: CarrierAnalyticsParams = Depends()):
    data = await AnalyticsService.get_carriers_analytics(params=params)
    target = params.route or "all routes"
    return ResponseEnvelope(
        success=True,
        data=data,
        message=f"Comparable carrier fare statistics for {target} retrieved."
    )

@router.get(
    "/fare-components",
    response_model=ResponseEnvelope[RouteFeeBreakdown],
    summary="Airfare Cost Component Decomposition",
    description=(
        "Decomposes total gross airfare into constituent components: base airfare, aviation fuel surcharge, "
        "statutory GST, and airport User Development Fees (UDF) for a specified route."
    ),
    responses={
        200: {"description": "Percentage and INR monetary fee breakdown for the route corridor."},
        422: STANDARD_ERROR_RESPONSES[422],
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_fare_components(
    route: str = Query("DEL-BOM", description="Aviation route corridor (e.g. DEL-BOM)", examples=["DEL-BOM"])
):
    data = await AnalyticsService.get_fee_breakdown(route=route)
    return ResponseEnvelope(
        success=True,
        data=data,
        message=f"Fare component decomposition (Base, Taxes, UDF) for route {route} generated."
    )

# Backward-compatibility routes
@router.get(
    "/surge/{route}",
    response_model=ResponseEnvelope[LeadTimeAnalysisResponse],
    summary="Route Advance-Purchase Surge Analysis (Legacy)",
    description="Legacy route surge alias mapping to lead-time pricing analysis.",
    include_in_schema=False
)
async def get_route_surge(
    route: str = Path(..., description="Route corridor e.g. DEL-BOM", examples=["DEL-BOM"])
):
    params = LeadTimeAnalysisParams(route=route)
    data = await AnalyticsService.get_lead_time_behaviour(params=params)
    return ResponseEnvelope(
        success=True,
        data=data,
        message=f"Surge analysis for route {route} generated."
    )

@router.get(
    "/breakdown/{route}",
    response_model=ResponseEnvelope[RouteFeeBreakdown],
    summary="Fee Breakdown by Route Corridor (Legacy)",
    description="Legacy fee breakdown alias.",
    include_in_schema=False
)
async def get_fee_breakdown(
    route: str = Path(..., description="Route corridor e.g. DEL-BOM", examples=["DEL-BOM"])
):
    data = await AnalyticsService.get_fee_breakdown(route)
    return ResponseEnvelope(
        success=True,
        data=data,
        message=f"Fee component breakdown for route {route} generated."
    )

@router.get(
    "/macro/oil",
    response_model=ResponseEnvelope[MacroAnalyticsResponse],
    summary="Brent Crude Oil Macro Indicators",
    description="Returns Brent crude oil price time-series and correlation indicators with aviation fuel costs.",
    responses={
        200: {"description": "Crude oil market pricing time-series."},
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_macro_oil():
    data = await AnalyticsService.get_macro_indicators()
    return ResponseEnvelope(
        success=True,
        data=data,
        message="Brent crude oil macro indicator data retrieved."
    )

import json
import os

@router.get("/macro/oil", summary="Get Macro Oil Data")
async def get_oil_correlation():
    """Returns historical Brent Crude oil prices to correlate with the Airfare Index."""
    # Move up from app/api/v1/analytics.py to the ML directory where the JSON is stored
    db_path = os.path.join(os.path.dirname(__file__), "../../../../ML/macro_indicators_db.json")
    
    if not os.path.exists(db_path):
        return {"data": []}
        
    with open(db_path, "r") as f:
        oil_data = json.load(f)
        
    return {"data": oil_data}
