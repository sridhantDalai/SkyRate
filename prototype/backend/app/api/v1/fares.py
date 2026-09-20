from typing import Optional
from fastapi import APIRouter, Depends
from app.services.fare_service import FareService
from app.schemas.fare import (
    LatestFaresParams, LatestFaresResponse,
    FareHistoryParams, FareHistoryResponse,
    FareDistributionParams, FareDistributionResponse,
    FareListResponse
)
from app.schemas.common import ResponseEnvelope, STANDARD_ERROR_RESPONSES

router = APIRouter(prefix="/fares", tags=["Fares"])

@router.get(
    "/latest",
    response_model=ResponseEnvelope[LatestFaresResponse],
    summary="Retrieve Latest Scraped Airfares",
    description=(
        "Retrieve granular flight-level airfare observations from the latest or specified partition date in Supabase. "
        "Supports comprehensive filtering across 3-letter IATA airport codes, route corridors, commercial carriers, "
        "advance-purchase booking horizons (T, T+1, T+7, T+15, T+30, T+45), nonstop flags, and maximum price thresholds. "
        "Results are paginated via limit and offset parameters."
    ),
    responses={
        200: {"description": "Paginated list of flight observations from the active partition table."},
        404: STANDARD_ERROR_RESPONSES[404],
        422: STANDARD_ERROR_RESPONSES[422],
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
@router.get(
    "",
    response_model=ResponseEnvelope[LatestFaresResponse],
    summary="Retrieve Latest Scraped Airfares (Root Alias)",
    description="Root alias for /api/v1/fares/latest supporting identical filtering and pagination.",
    include_in_schema=False
)
async def get_latest_fares(
    params: LatestFaresParams = Depends()
):
    result = await FareService.list_fares(params)
    return ResponseEnvelope(
        success=True,
        data=result,
        message=f"Retrieved {len(result.items)} flights for partition {result.partition_date}."
    )

@router.get(
    "/history",
    response_model=ResponseEnvelope[FareHistoryResponse],
    summary="Retrieve Airfare History Timeline",
    description=(
        "Retrieve daily historical airfare timelines and aggregate price metrics across date partitions "
        "for a given route, carrier, and advance-purchase horizon within a specified date window (up to 90 days)."
    ),
    responses={
        200: {"description": "Time-series daily price trajectory and sample volume across partitions."},
        422: STANDARD_ERROR_RESPONSES[422],
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_fare_history(
    params: FareHistoryParams = Depends()
):
    result = await FareService.get_fare_history(params)
    return ResponseEnvelope(
        success=True,
        data=result,
        message=f"Historical fare timeline retrieved for {params.route or 'all routes'}."
    )

@router.get(
    "/distribution",
    response_model=ResponseEnvelope[FareDistributionResponse],
    summary="Statistical Airfare Distribution",
    description=(
        "Computes descriptive price statistics (minimum, maximum, median, 25th percentile, 75th percentile, "
        "standard deviation) and frequency histogram buckets for an aviation route, carrier, or horizon."
    ),
    responses={
        200: {"description": "Parametric and non-parametric statistical dispersion metrics with histogram frequency distribution."},
        422: STANDARD_ERROR_RESPONSES[422],
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_fare_distribution(
    params: FareDistributionParams = Depends()
):
    result = await FareService.get_fare_distribution(params)
    return ResponseEnvelope(
        success=True,
        data=result,
        message=f"Fare price distribution for {params.route or 'all routes'} generated."
    )
