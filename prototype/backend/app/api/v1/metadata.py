from typing import Dict, Any, List
from fastapi import APIRouter
from app.schemas.common import ResponseEnvelope, STANDARD_ERROR_RESPONSES
from app.core.cache import cache, TTL

router = APIRouter(prefix="/metadata", tags=["Metadata"])

# ---------------------------------------------------------------------------
# Static reference data — defined once, served from memory, never re-queried
# ---------------------------------------------------------------------------
AIRPORTS: List[Dict[str, Any]] = [
    {"code": "DEL", "city": "Delhi",           "name": "Indira Gandhi International Airport",             "udf": 77},
    {"code": "BOM", "city": "Mumbai",          "name": "Chhatrapati Shivaji Maharaj International Airport","udf": 120},
    {"code": "BLR", "city": "Bengaluru",       "name": "Kempegowda International Airport",                "udf": 250},
    {"code": "HYD", "city": "Hyderabad",       "name": "Rajiv Gandhi International Airport",              "udf": 281},
    {"code": "CCU", "city": "Kolkata",         "name": "Netaji Subhash Chandra Bose International Airport","udf": 150},
    {"code": "MAA", "city": "Chennai",         "name": "Chennai International Airport",                   "udf": 100},
    {"code": "GOI", "city": "Goa (Dabolim)",   "name": "Dabolim Airport",                                 "udf":  80},
    {"code": "PNQ", "city": "Pune",            "name": "Pune Airport",                                    "udf":  50},
    {"code": "AMD", "city": "Ahmedabad",       "name": "Sardar Vallabhbhai Patel International Airport",  "udf": 110},
    {"code": "SXR", "city": "Srinagar",        "name": "Sheikh ul-Alam International Airport",             "udf":   0},
    {"code": "COK", "city": "Kochi",           "name": "Cochin International Airport",                    "udf": 170},
    {"code": "JAI", "city": "Jaipur",          "name": "Jaipur International Airport",                    "udf": 150},
]

HORIZONS: List[Dict[str, Any]] = [
    {"code": "T",    "days":  0, "label": "Same Day (T)"},
    {"code": "T+1",  "days":  1, "label": "Next Day (T+1)"},
    {"code": "T+7",  "days":  7, "label": "1 Week (T+7)"},
    {"code": "T+15", "days": 15, "label": "15 Days (T+15)"},
    {"code": "T+30", "days": 30, "label": "1 Month (T+30)"},
    {"code": "T+45", "days": 45, "label": "45 Days (T+45)"},
]

CARRIERS: List[Dict[str, Any]] = [
    {"code": "6E", "name": "IndiGo",             "type": "Low-Cost Carrier"},
    {"code": "AI", "name": "Air India",           "type": "Full-Service Carrier"},
    {"code": "IX", "name": "Air India Express",   "type": "Low-Cost Carrier"},
    {"code": "SG", "name": "SpiceJet",            "type": "Low-Cost Carrier"},
    {"code": "QP", "name": "Akasa Air",           "type": "Ultra-Low-Cost Carrier"},
]

MONITORED_ROUTES: List[str] = [
    "DEL-BOM", "BOM-DEL", "BLR-DEL", "DEL-BLR",
    "BOM-BLR", "BLR-BOM", "DEL-CCU", "CCU-DEL",
    "DEL-HYD", "HYD-DEL", "BOM-GOI", "GOI-BOM",
    "DEL-MAA", "MAA-DEL", "BOM-HYD", "HYD-BOM",
]

# Pre-build the consolidated bundle once at module load (pure in-memory)
_METADATA_BUNDLE: Dict[str, Any] = {
    "airports": AIRPORTS,
    "horizons": HORIZONS,
    "carriers": CARRIERS,
    "routes": MONITORED_ROUTES,
    "version": "1.0.0",
}

# Seed the cache at import time — these values never change at runtime
cache.set("metadata_airports",  AIRPORTS,          TTL.METADATA)
cache.set("metadata_horizons",  HORIZONS,          TTL.METADATA)
cache.set("metadata_carriers",  CARRIERS,          TTL.METADATA)
cache.set("metadata_routes",    MONITORED_ROUTES,  TTL.METADATA)
cache.set("metadata_all",       _METADATA_BUNDLE,  TTL.METADATA)


# ---------------------------------------------------------------------------
# Endpoints — all reads come from the in-process cache
# ---------------------------------------------------------------------------

@router.get(
    "/carriers",
    response_model=ResponseEnvelope[List[Dict[str, Any]]],
    summary="List Commercial Airlines",
    description="Master list of tracked commercial airlines with IATA codes and business model categorization.",
    responses={503: STANDARD_ERROR_RESPONSES[503]},
)
async def get_carriers():
    data = cache.get("metadata_carriers") or CARRIERS
    return ResponseEnvelope(success=True, data=data,
                            message="Supported commercial airlines list retrieved.")


@router.get(
    "/airports",
    response_model=ResponseEnvelope[List[Dict[str, Any]]],
    summary="List Monitored Airports & Tariffs",
    description="Indian commercial airports with IATA codes and regulated UDF tariffs.",
    responses={503: STANDARD_ERROR_RESPONSES[503]},
)
async def get_airports():
    data = cache.get("metadata_airports") or AIRPORTS
    return ResponseEnvelope(success=True, data=data,
                            message="Supported airports and UDF fee schedule retrieved.")


@router.get(
    "/routes",
    response_model=ResponseEnvelope[List[str]],
    summary="List Monitored Aviation Route Pairs",
    description="All monitored domestic DGCA city-pair flight corridors.",
    responses={503: STANDARD_ERROR_RESPONSES[503]},
)
async def get_monitored_routes():
    data = cache.get("metadata_routes") or MONITORED_ROUTES
    return ResponseEnvelope(success=True, data=data,
                            message="Monitored DGCA route pairs retrieved.")


@router.get(
    "/horizons",
    response_model=ResponseEnvelope[List[Dict[str, Any]]],
    summary="List Advance-Purchase Horizons",
    description="Supported advance-purchase booking horizons (T, T+1, T+7, T+15, T+30, T+45).",
    responses={503: STANDARD_ERROR_RESPONSES[503]},
)
async def get_horizons():
    data = cache.get("metadata_horizons") or HORIZONS
    return ResponseEnvelope(success=True, data=data,
                            message="Supported advance-purchase time horizons retrieved.")


@router.get(
    "",
    response_model=ResponseEnvelope[Dict[str, Any]],
    summary="Consolidated System Metadata",
    description="Single-call payload with airports, airlines, horizons, routes, and API version.",
    responses={503: STANDARD_ERROR_RESPONSES[503]},
)
async def get_metadata_all():
    data = cache.get("metadata_all") or _METADATA_BUNDLE
    return ResponseEnvelope(success=True, data=data, message="System metadata retrieved.")
