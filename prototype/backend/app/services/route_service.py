from typing import List, Dict, Any, Optional
from app.repositories.route_repository import RouteRepository
from app.core.cache import cache, TTL

# Route distance/duration metadata (static reference data)
_ROUTE_META: Dict[str, Dict[str, Any]] = {
    "DEL-BOM": {"distance_km": 1148, "avg_flight_duration": "2h 10m", "peak_surge_window": "T+1"},
    "BOM-DEL": {"distance_km": 1148, "avg_flight_duration": "2h 10m", "peak_surge_window": "T+1"},
    "BLR-DEL": {"distance_km": 1740, "avg_flight_duration": "2h 45m", "peak_surge_window": "T+1"},
    "DEL-BLR": {"distance_km": 1740, "avg_flight_duration": "2h 45m", "peak_surge_window": "T+1"},
    "BOM-BLR": {"distance_km":  984, "avg_flight_duration": "1h 35m", "peak_surge_window": "T+7"},
    "BLR-BOM": {"distance_km":  984, "avg_flight_duration": "1h 35m", "peak_surge_window": "T+7"},
    "DEL-CCU": {"distance_km": 1305, "avg_flight_duration": "2h 20m", "peak_surge_window": "T+1"},
    "CCU-DEL": {"distance_km": 1305, "avg_flight_duration": "2h 20m", "peak_surge_window": "T+1"},
    "BOM-GOI": {"distance_km":  595, "avg_flight_duration": "1h 05m", "peak_surge_window": "T+15"},
    "GOI-BOM": {"distance_km":  595, "avg_flight_duration": "1h 05m", "peak_surge_window": "T+15"},
    "DEL-HYD": {"distance_km": 1253, "avg_flight_duration": "2h 05m", "peak_surge_window": "T+1"},
    "HYD-DEL": {"distance_km": 1253, "avg_flight_duration": "2h 05m", "peak_surge_window": "T+1"},
    "DEL-MAA": {"distance_km": 1754, "avg_flight_duration": "2h 50m", "peak_surge_window": "T+1"},
    "MAA-DEL": {"distance_km": 1754, "avg_flight_duration": "2h 50m", "peak_surge_window": "T+1"},
    "BOM-HYD": {"distance_km":  711, "avg_flight_duration": "1h 15m", "peak_surge_window": "T+7"},
    "HYD-BOM": {"distance_km":  711, "avg_flight_duration": "1h 15m", "peak_surge_window": "T+7"},
}
_DEFAULT_META = {"distance_km": 900, "avg_flight_duration": "1h 45m", "peak_surge_window": "T+1"}
_MONITORED_CARRIERS = ["IndiGo", "Air India", "Air India Express", "SpiceJet", "Akasa Air"]


class RouteService:
    @staticmethod
    async def get_all_routes() -> List[Dict[str, Any]]:
        return await cache.get_or_fetch(
            key="routes_all",
            fetcher=RouteRepository.get_all_routes,
            ttl=TTL.ROUTES,
        )

    @staticmethod
    async def get_route_details(route: str) -> Optional[Dict[str, Any]]:
        target = route.strip().upper()
        if "-" not in target:
            return None
        parts = target.split("-")
        if len(parts) != 2 or len(parts[0]) != 3 or len(parts[1]) != 3:
            return None

        cache_key = f"route_detail:{target}"

        async def _fetch():
            all_routes = await RouteService.get_all_routes()
            for r in all_routes:
                if r.get("route") == target:
                    meta = _ROUTE_META.get(target, _DEFAULT_META)
                    return {**r, **meta, "monitored_carriers": _MONITORED_CARRIERS}

            # Fallback for valid airport pair format not in master table
            orig, dest = parts[0], parts[1]
            orig_city = RouteRepository.CITY_LOOKUP.get(orig, orig)
            dest_city = RouteRepository.CITY_LOOKUP.get(dest, dest)
            meta = _ROUTE_META.get(target, _DEFAULT_META)
            return {
                "route": target,
                "origin": orig,
                "destination": dest,
                "origin_city": orig_city,
                "destination_city": dest_city,
                "density": "Standard",
                "has_live_data": False,
                "live_observations": 0,
                **meta,
                "monitored_carriers": _MONITORED_CARRIERS,
            }

        return await cache.get_or_fetch(
            key=cache_key,
            fetcher=_fetch,
            ttl=TTL.ROUTE_DETAIL,
        )
