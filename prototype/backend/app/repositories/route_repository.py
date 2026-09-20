from typing import List, Dict, Any
from app.db.supabase import SupabaseManager
from app.core.logging import logger

DEFAULT_ROUTES = [
    {"route": "DEL-BOM", "origin": "DEL", "destination": "BOM", "origin_city": "Delhi", "destination_city": "Mumbai", "density": "High"},
    {"route": "BLR-DEL", "origin": "BLR", "destination": "DEL", "origin_city": "Bengaluru", "destination_city": "Delhi", "density": "High"},
    {"route": "BOM-GOI", "origin": "BOM", "destination": "GOI", "origin_city": "Mumbai", "destination_city": "Goa", "density": "Medium"},
    {"route": "DEL-CCU", "origin": "DEL", "destination": "CCU", "origin_city": "Delhi", "destination_city": "Kolkata", "density": "High"},
    {"route": "BOM-BLR", "origin": "BOM", "destination": "BLR", "origin_city": "Mumbai", "destination_city": "Bengaluru", "density": "High"},
    {"route": "HYD-MAA", "origin": "HYD", "destination": "MAA", "origin_city": "Hyderabad", "destination_city": "Chennai", "density": "Medium"},
    {"route": "AMD-BOM", "origin": "AMD", "destination": "BOM", "origin_city": "Ahmedabad", "destination_city": "Mumbai", "density": "Medium"},
    {"route": "DEL-SXR", "origin": "DEL", "destination": "SXR", "origin_city": "Delhi", "destination_city": "Srinagar", "density": "High"},
]

class RouteRepository:
    @staticmethod
    async def get_all_routes() -> List[Dict[str, Any]]:
        table_name, is_live = await SupabaseManager.resolve_active_scraped_table()
        client = SupabaseManager.get_client()

        if is_live and client:
            try:
                res = client.table(table_name).select("route").limit(1000).execute()
                if res.data:
                    unique_routes = sorted(list(set(row["route"] for row in res.data if row.get("route"))))
                    result = []
                    for r in unique_routes:
                        parts = r.split("-")
                        if len(parts) == 2:
                            result.append({
                                "route": r,
                                "origin": parts[0],
                                "destination": parts[1],
                                "origin_city": parts[0],
                                "destination_city": parts[1],
                                "density": "High"
                            })
                    return result
            except Exception as e:
                logger.error(f"Error reading unique routes from Supabase: {e}")

        return DEFAULT_ROUTES
