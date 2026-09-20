from typing import List, Dict, Any
from fastapi import APIRouter, HTTPException, status, Path
from app.services.route_service import RouteService
from app.schemas.common import ResponseEnvelope, STANDARD_ERROR_RESPONSES

router = APIRouter(prefix="/routes", tags=["Routes"])

@router.get(
    "",
    response_model=ResponseEnvelope[List[Dict[str, Any]]],
    summary="List Monitored Aviation Corridors",
    description=(
        "Retrieves a list of all monitored DGCA airline route pairs, complete with origin and destination "
        "airport codes, city names, and traffic density classifications (High, Medium, Standard)."
    ),
    responses={
        200: {
            "description": "List of monitored aviation corridors with operational metadata.",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "data": [
                            {
                                "route": "DEL-BOM",
                                "origin": "DEL",
                                "destination": "BOM",
                                "origin_city": "Delhi",
                                "destination_city": "Mumbai",
                                "density": "High"
                            }
                        ],
                        "message": "Retrieved 8 monitored DGCA routes.",
                        "timestamp": "2026-09-19T12:00:00"
                    }
                }
            }
        },
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_routes():
    routes = await RouteService.get_all_routes()
    return ResponseEnvelope(
        success=True,
        data=routes,
        message=f"Retrieved {len(routes)} monitored DGCA routes."
    )

@router.get(
    "/{route}",
    response_model=ResponseEnvelope[Dict[str, Any]],
    summary="Get Route Corridor Details",
    description=(
        "Retrieves detailed operational characteristics for an individual aviation route corridor, including "
        "distance in kilometers, estimated average flight duration, active monitored carriers, and primary surge windows."
    ),
    responses={
        200: {
            "description": "Comprehensive route metadata and operational flight parameters.",
            "content": {
                "application/json": {
                    "example": {
                        "success": True,
                        "data": {
                            "route": "DEL-BOM",
                            "origin": "DEL",
                            "destination": "BOM",
                            "origin_city": "Delhi",
                            "destination_city": "Mumbai",
                            "density": "High",
                            "distance_km": 1148,
                            "avg_flight_duration": "2h 10m",
                            "monitored_carriers": ["IndiGo", "Air India", "SpiceJet", "Akasa Air"],
                            "peak_surge_window": "T+1"
                        },
                        "message": "Details for route DEL-BOM retrieved.",
                        "timestamp": "2026-09-19T12:00:00"
                    }
                }
            }
        },
        404: STANDARD_ERROR_RESPONSES[404],
        503: STANDARD_ERROR_RESPONSES[503]
    }
)
async def get_route_details(
    route: str = Path(
        ...,
        description="Aviation route pair formatted as ORIGIN-DESTINATION (e.g. DEL-BOM)",
        examples=["DEL-BOM"]
    )
):
    details = await RouteService.get_route_details(route)
    if not details:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Route '{route}' not found in monitored database."
        )
    return ResponseEnvelope(
        success=True,
        data=details,
        message=f"Details for route {route.upper()} retrieved."
    )
