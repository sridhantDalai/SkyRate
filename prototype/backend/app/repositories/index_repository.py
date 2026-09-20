from app.core.sanitizer import sanitize_partition_date
from typing import List, Dict, Any, Tuple, Optional
from datetime import datetime
from app.db.supabase import SupabaseManager
from app.core.logging import logger

class IndexRepository:
    @staticmethod
    async def get_latest_indexes(
        state: Optional[str] = None,
        horizon: Optional[str] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[Dict[str, Any]], int, str, str]:
        """
        Queries the most recent active index table.
        Returns: (records, total_count, partition_table, partition_date)
        """
        table_name, is_live = await SupabaseManager.resolve_active_index_table()
        partition_date = sanitize_partition_date(table_name)
        client = SupabaseManager.get_client()

        if is_live and client:
            try:
                query = client.table(table_name).select("*", count="exact")
                if state:
                    query = query.ilike("State", f"%{state.strip()}%")
                if horizon:
                    query = query.eq("Time_Horizon", horizon.strip().upper())

                res = query.range(offset, offset + limit - 1).execute()
                items = res.data or []
                total = res.count if res.count is not None else len(items)
                return items, total, table_name, partition_date
            except Exception as e:
                logger.error(f"Error querying Supabase index table {table_name}: {e}")

        # Graceful fallback: load fallback dataset (e.g. api_output.json or embedded seed)
        raw_fallback = SupabaseManager.load_fallback_index_data()
        filtered = raw_fallback
        if state:
            s_lower = state.strip().lower()
            filtered = [r for r in filtered if s_lower in r.get("State", "").lower()]
        if horizon:
            h_upper = horizon.strip().upper()
            filtered = [r for r in filtered if r.get("Time_Horizon", "").upper() == h_upper]

        total = len(filtered)
        paged = filtered[offset : offset + limit]
        return paged, total, table_name, partition_date

    @staticmethod
    async def get_index_records() -> Tuple[List[Dict[str, Any]], str]:
        """Legacy helper for cross-state and history overviews."""
        records, _, table_name, _ = await IndexRepository.get_latest_indexes(limit=500)
        return records, table_name

    @staticmethod
    async def get_apix_overview_metrics() -> Dict[str, Any]:
        """
        Derives latest APIx, previous APIx, and percentage change from index partition tables.
        Returns:
            - latest_apix: Optional[float]
            - previous_apix: Optional[float]
            - percentage_change: Optional[float]
            - basket_inflation: Optional[str]
            - partition_date: str
            - partition_table: str
            - omitted_notes: Optional[Dict[str, str]]
        """
        table_name, is_live = await SupabaseManager.resolve_active_index_table()
        partition_date = sanitize_partition_date(table_name)
        client = SupabaseManager.get_client() if is_live else None

        omitted_notes: Dict[str, str] = {}
        latest_apix: Optional[float] = None
        previous_apix: Optional[float] = None
        percentage_change: Optional[float] = None
        basket_inflation: Optional[str] = None

        # 1. Fetch Latest APIx for All India, Horizon T
        latest_items, _, _, _ = await IndexRepository.get_latest_indexes(state="All India", horizon="T", limit=1)
        if not latest_items:
            latest_items, _, _, _ = await IndexRepository.get_latest_indexes(state="All India", limit=1)
        if not latest_items:
            latest_items, _, _, _ = await IndexRepository.get_latest_indexes(limit=1)

        if latest_items:
            record = latest_items[0]
            latest_apix = float(record["RealTime_APIx"]) if record.get("RealTime_APIx") is not None else None
            basket_inflation = record.get("Basket_Inflation")
        else:
            omitted_notes["latest_apix"] = "No index record found in active index partition."

        # 2. Derive Previous APIx if prior partition exists in Supabase
        if is_live and client and latest_apix is not None:
            try:
                from datetime import timedelta
                try:
                    current_dt = datetime.strptime(partition_date, "%Y-%m-%d")
                except ValueError:
                    current_dt = datetime.strptime(partition_date, "%d_%m_%Y")
                # Look backwards 1 to 7 days for the prior index partition
                for day_back in range(1, 8):
                    prev_dt = current_dt - timedelta(days=day_back)
                    prev_table = f"index_for_{prev_dt.strftime('%d_%m_%Y')}"
                    try:
                        res = client.table(prev_table).select("RealTime_APIx").eq("State", "All India").eq("Time_Horizon", "T").limit(1).execute()
                        if res.data and len(res.data) > 0 and res.data[0].get("RealTime_APIx") is not None:
                            previous_apix = float(res.data[0]["RealTime_APIx"])
                            break
                    except Exception:
                        continue
            except Exception as e:
                logger.warning(f"Failed to probe prior index partition: {e}")

        # 3. Calculate percentage change or document omission
        if latest_apix is not None and previous_apix is not None and previous_apix > 0:
            percentage_change = round(((latest_apix - previous_apix) / previous_apix) * 100.0, 2)
        else:
            if previous_apix is None:
                omitted_notes["previous_apix"] = "Prior index partition table not found in database; previous APIx omitted per database contract."
                omitted_notes["percentage_change"] = "Cannot compute percentage change without previous APIx baseline."

        return {
            "latest_apix": latest_apix,
            "previous_apix": previous_apix,
            "percentage_change": percentage_change,
            "basket_inflation": basket_inflation,
            "partition_date": partition_date,
            "partition_table": table_name,
            "omitted_notes": omitted_notes if omitted_notes else None,
        }
