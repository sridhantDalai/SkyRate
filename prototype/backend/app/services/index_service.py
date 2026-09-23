from typing import List, Dict, Any, Optional
from datetime import datetime, timedelta
from app.repositories.index_repository import IndexRepository
from app.core.cache import cache, TTL
from app.schemas.index import (
    IndexOverview, APIxIndexRecord, StateIndexComparison,
    IndexHistoryItem, IndexCompareResponse, IndexComparisonItem,
    LatestIndexResponse, IndexItem, IndexFilterParams,
)

# Route-to-Origin-State mapping established in ML (index_calculator.py)
ROUTE_TO_STATE: Dict[str, str] = {
    "DEL-BOM": "Delhi",     "BLR-DEL": "Karnataka",  "BOM-GOI": "Maharashtra",
    "DEL-CCU": "Delhi",     "BOM-BLR": "Maharashtra", "HYD-MAA": "Telangana",
    "PNQ-DEL": "Maharashtra","CCU-BLR": "West Bengal", "AMD-BOM": "Gujarat",
    "DEL-SXR": "Delhi",     "BOM-COK": "Maharashtra", "MAA-CCU": "Tamil Nadu",
    "DEL-HYD": "Delhi",     "BLR-PNQ": "Karnataka",  "BOM-JAI": "Maharashtra",
}
AIRPORT_TO_STATE: Dict[str, str] = {
    "DEL": "Delhi",    "BOM": "Maharashtra", "PNQ": "Maharashtra",
    "BLR": "Karnataka","HYD": "Telangana",   "CCU": "West Bengal",
    "MAA": "Tamil Nadu","AMD": "Gujarat",     "GOI": "Goa",
    "GOX": "Goa",      "JAI": "Rajasthan",   "COK": "Kerala",
    "SXR": "Jammu and Kashmir",
}


class IndexService:

    @staticmethod
    async def get_latest_index(params: IndexFilterParams) -> LatestIndexResponse:
        filters_applied: Dict[str, Any] = {}
        target_state = params.state.strip() if params.state else None
        route_key: Optional[str] = None
        carrier_key: Optional[str] = None

        if params.route:
            route_key = params.route.strip().upper()
            filters_applied["route"] = route_key
            mapped = ROUTE_TO_STATE.get(route_key) or AIRPORT_TO_STATE.get(route_key.split("-")[0])
            if not target_state and mapped:
                target_state = mapped

        if target_state:
            filters_applied["state"] = target_state

        if params.carrier:
            carrier_key = params.carrier.strip().lower()
            filters_applied["carrier"] = f"{params.carrier.strip()} (Macro aggregate)"

        target_horizon = params.horizon.strip().upper() if params.horizon else None
        if target_horizon:
            if target_horizon.startswith("T ") and target_horizon[2:].isdigit():
                target_horizon = f"T+{target_horizon[2:]}"
            filters_applied["horizon"] = target_horizon

        # Cache key encodes all filter dimensions
        cache_key = (
            f"index_latest:{target_state or '*'}:{target_horizon or '*'}"
            f":route{route_key or '*'}:carrier{carrier_key or '*'}"
            f":lim{params.limit}:off{params.offset}"
        )

        async def _fetch():
            records, total_count, partition_table, partition_date = (
                await IndexRepository.get_latest_indexes(
                    state=target_state, horizon=target_horizon,
                    limit=params.limit, offset=params.offset,
                )
            )
            items: List[IndexItem] = []
            for r in records:
                items.append(IndexItem(
                    state=r.get("State") or r.get("state") or "Unknown",
                    time_horizon=r.get("Time_Horizon") or r.get("time_horizon") or "Unknown",
                    mospi_base=float(r.get("MoSPI_Base") or r.get("mospi_base") or 100.0),
                    basket_inflation=str(r.get("Basket_Inflation") or r.get("basket_inflation") or "0.0%"),
                    real_time_apix=float(r.get("RealTime_APIx") or r.get("real_time_apix") or 100.0),
                ))
            return LatestIndexResponse(
                partition_date=partition_date,
                partition_table=partition_table,
                total=total_count,
                limit=params.limit,
                offset=params.offset,
                filters_applied=filters_applied,
                items=items,
            )

        # Partition-tagged so it's evicted when a new daily ML run is detected
        result = await cache.get_or_fetch(
            key=cache_key,
            fetcher=_fetch,
            ttl=TTL.INDEX_LATEST,
        )
        return result

    @staticmethod
    async def get_overview() -> IndexOverview:
        async def _fetch():
            records, partition_table = await IndexRepository.get_index_records()
            all_india = [APIxIndexRecord(**r) for r in records if r.get("State") == "All India"]
            states    = [APIxIndexRecord(**r) for r in records if r.get("State") != "All India"]
            return IndexOverview(
                partition_date=partition_table,
                all_india=all_india,
                states=states,
                updated_at=datetime.now().isoformat(),
            )

        return await cache.get_or_fetch(
            key="index_overview",
            fetcher=_fetch,
            ttl=TTL.INDEX_OVERVIEW,
        )

    @staticmethod
    async def get_state_index(state_name: str) -> Optional[StateIndexComparison]:
        cache_key = f"index_state:{state_name.lower()}"

        async def _fetch():
            records, _ = await IndexRepository.get_index_records()
            matching = [
                APIxIndexRecord(**r)
                for r in records
                if r.get("State", "").lower() == state_name.lower()
            ]
            if not matching:
                return None
            latest = matching[0]
            return StateIndexComparison(
                state=latest.State,
                latest_apix=latest.RealTime_APIx,
                mospi_base=latest.MoSPI_Base,
                basket_inflation=latest.Basket_Inflation,
                horizons=matching,
            )

        return await cache.get_or_fetch(
            key=cache_key,
            fetcher=_fetch,
            ttl=TTL.INDEX_OVERVIEW,
        )

    @staticmethod
    async def get_index_history(state: Optional[str] = None, days: int = 7) -> List[IndexHistoryItem]:
        # History is synthetic (no real multi-day partition table yet) — cache briefly
        cache_key = f"index_history:{(state or 'All India').lower()}:{days}"

        def _build():
            target_state = state or "All India"
            base = 153.26 if target_state == "All India" else 158.40
            mospi_ref = 134.20
            now = datetime.now()
            history = []
            for i in range(days, 0, -1):
                dt = now - timedelta(days=i)
                noise = ((i * 13) % 25 - 10) * 0.15
                apix_val = round(base + noise, 2)
                inf_val = round(((apix_val / mospi_ref) - 1.0) * 100, 2)
                history.append(IndexHistoryItem(
                    date=dt.strftime("%Y-%m-%d"),
                    state=target_state,
                    time_horizon="T+1",
                    apix=apix_val,
                    mospi_base=mospi_ref,
                    basket_inflation=f"{inf_val:+.2f}%",
                ))
            return history

        cached_val = cache.get(cache_key)
        if cached_val is not None:
            return cached_val
        result = _build()
        cache.set(cache_key, result, TTL.INDEX_OVERVIEW)
        return result

    @staticmethod
    async def compare_indexes() -> IndexCompareResponse:
        async def _fetch():
            records, _ = await IndexRepository.get_index_records()
            comparisons = []
            seen: set = set()
            for r in records:
                state = r.get("State", "Unknown")
                if state in seen:
                    continue
                seen.add(state)
                apix = float(r.get("RealTime_APIx", 100.0))
                base = float(r.get("MoSPI_Base", 100.0))
                divergence = round(((apix - base) / base) * 100, 2)
                comparisons.append(IndexComparisonItem(
                    entity=state,
                    current_apix=apix,
                    mospi_base=base,
                    inflation_rate=r.get("Basket_Inflation", "0.0%"),
                    divergence_pct=divergence,
                ))
            return IndexCompareResponse(benchmark="MoSPI 2024 Base", comparisons=comparisons)

        return await cache.get_or_fetch(
            key="index_compare",
            fetcher=_fetch,
            ttl=TTL.INDEX_OVERVIEW,
        )
