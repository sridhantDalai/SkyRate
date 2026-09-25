from typing import List, Dict, Any
from collections import Counter
from app.db.supabase import SupabaseManager
from app.core.logging import logger

CITY_LOOKUP: Dict[str, str] = {
    "DEL": "Delhi",
    "BOM": "Mumbai",
    "BLR": "Bengaluru",
    "HYD": "Hyderabad",
    "CCU": "Kolkata",
    "MAA": "Chennai",
    "GOI": "Goa",
    "PNQ": "Pune",
    "AMD": "Ahmedabad",
    "SXR": "Srinagar",
    "COK": "Kochi",
    "JAI": "Jaipur",
}

MONITORED_DGCA_ROUTES: List[Dict[str, Any]] = [
    {"route": "DEL-BOM", "origin": "DEL", "destination": "BOM", "origin_city": "Delhi", "destination_city": "Mumbai", "density": "High"},
    {"route": "BLR-DEL", "origin": "BLR", "destination": "DEL", "origin_city": "Bengaluru", "destination_city": "Delhi", "density": "High"},
    {"route": "BOM-GOI", "origin": "BOM", "destination": "GOI", "origin_city": "Mumbai", "destination_city": "Goa", "density": "Medium"},
    {"route": "DEL-CCU", "origin": "DEL", "destination": "CCU", "origin_city": "Delhi", "destination_city": "Kolkata", "density": "High"},
    {"route": "BOM-BLR", "origin": "BOM", "destination": "BLR", "origin_city": "Mumbai", "destination_city": "Bengaluru", "density": "High"},
    {"route": "BOM-DEL", "origin": "BOM", "destination": "DEL", "origin_city": "Mumbai", "destination_city": "Delhi", "density": "High"},
    {"route": "DEL-BLR", "origin": "DEL", "destination": "BLR", "origin_city": "Delhi", "destination_city": "Bengaluru", "density": "High"},
    {"route": "BLR-BOM", "origin": "BLR", "destination": "BOM", "origin_city": "Bengaluru", "destination_city": "Mumbai", "density": "High"},
    {"route": "CCU-DEL", "origin": "CCU", "destination": "DEL", "origin_city": "Kolkata", "destination_city": "Delhi", "density": "High"},
    {"route": "GOI-BOM", "origin": "GOI", "destination": "BOM", "origin_city": "Goa", "destination_city": "Mumbai", "density": "Medium"},
    {"route": "DEL-HYD", "origin": "DEL", "destination": "HYD", "origin_city": "Delhi", "destination_city": "Hyderabad", "density": "Medium"},
    {"route": "HYD-DEL", "origin": "HYD", "destination": "DEL", "origin_city": "Hyderabad", "destination_city": "Delhi", "density": "Medium"},
    {"route": "DEL-MAA", "origin": "DEL", "destination": "MAA", "origin_city": "Delhi", "destination_city": "Chennai", "density": "Standard"},
    {"route": "MAA-DEL", "origin": "MAA", "destination": "DEL", "origin_city": "Chennai", "destination_city": "Delhi", "density": "Standard"},
    {"route": "BOM-HYD", "origin": "BOM", "destination": "HYD", "origin_city": "Mumbai", "destination_city": "Hyderabad", "density": "Medium"},
    {"route": "HYD-BOM", "origin": "HYD", "destination": "BOM", "origin_city": "Hyderabad", "destination_city": "Mumbai", "density": "Medium"},
]

DEFAULT_ROUTES = MONITORED_DGCA_ROUTES


class RouteRepository:
    CITY_LOOKUP = CITY_LOOKUP

    @staticmethod
    async def get_all_routes() -> List[Dict[str, Any]]:
        table_name, is_live = await SupabaseManager.resolve_active_scraped_table()
        client = SupabaseManager.get_client()

        live_counts: Counter = Counter()

        if is_live and client:
            try:
                res = client.table(table_name).select("route").limit(1000).execute()
                if res.data:
                    for row in res.data:
                        r = row.get("route")
                        if r:
                            live_counts[r] += 1
            except Exception as e:
                logger.error(f"Error reading unique routes from Supabase: {e}")

        catalog: List[Dict[str, Any]] = []
        seen = set()

        for item in MONITORED_DGCA_ROUTES:
            r = item["route"]
            obs = live_counts.get(r, 0)
            catalog.append({
                **item,
                "has_live_data": obs > 0,
                "live_observations": obs,
            })
            seen.add(r)

        # Include any additional route discovered in the active table
        for r, obs in live_counts.items():
            if r not in seen:
                parts = r.split("-")
                orig = parts[0] if len(parts) == 2 else r
                dest = parts[1] if len(parts) == 2 else r
                catalog.append({
                    "route": r,
                    "origin": orig,
                    "destination": dest,
                    "origin_city": CITY_LOOKUP.get(orig, orig),
                    "destination_city": CITY_LOOKUP.get(dest, dest),
                    "density": "High",
                    "has_live_data": True,
                    "live_observations": obs,
                })
                seen.add(r)

        # Sort so routes with live data appear first, then alphabetically
        catalog.sort(key=lambda x: (-x.get("live_observations", 0), x["route"]))
        return catalog
