import os
import json
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List, Tuple
from app.core.config import settings
from app.core.logging import logger

try:
    from supabase import create_client, Client, ClientOptions
    import httpx
except ImportError:
    create_client = None
    Client = Any
    ClientOptions = None

class SupabaseManager:
    _client: Optional[Any] = None
    _cached_scraped: Optional[Tuple[str, bool]] = None
    _cached_scraped_time: float = 0
    _cached_index: Optional[Tuple[str, bool]] = None
    _cached_index_time: float = 0
    CACHE_TTL = 900  # 15 minutes

    @classmethod
    def get_client(cls) -> Optional[Any]:
        if cls._client is None and settings.SUPABASE_URL and settings.SUPABASE_SECRET_KEY:
            if create_client is not None:
                try:
                    if ClientOptions is not None:
                        options = ClientOptions(httpx_client=httpx.Client())
                        cls._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY, options=options)
                    else:
                        cls._client = create_client(settings.SUPABASE_URL, settings.SUPABASE_SECRET_KEY)
                    logger.info("Supabase client successfully initialized.")
                except Exception as e:
                    logger.warning(f"Failed to initialize Supabase client: {e}. Operating in fallback mode.")
                    cls._client = None
            else:
                logger.warning("supabase-py package not installed. Operating in fallback mode.")
                cls._client = None
        return cls._client

    @classmethod
    async def check_database_connectivity(cls) -> str:
        """
        Performs a live, non-blocking check against Supabase.
        Returns:
            "connected" if reachable and authenticated,
            "disconnected" if unreachable or credentials are unconfigured.
        """
        url = settings.SUPABASE_URL
        key = settings.SUPABASE_SECRET_KEY or settings.SUPABASE_PUBLISHABLE_KEY
        
        if not url or not key:
            return "disconnected"

        try:
            import httpx
            probe_url = f"{url.rstrip('/')}/rest/v1/"
            headers = {
                "apikey": key,
                "Authorization": f"Bearer {key}"
            }
            async with httpx.AsyncClient(timeout=3.0) as client:
                resp = await client.get(probe_url, headers=headers)
                if resp.status_code in (200, 204):
                    return "connected"
                return "disconnected"
        except Exception as e:
            logger.warning(f"Supabase connectivity check failed: {e}")
            return "disconnected"

    @classmethod
    def format_date_suffix(cls, dt: Optional[datetime] = None) -> str:
        target = dt or datetime.now()
        return target.strftime("%d_%m_%Y")

    @classmethod
    def get_scraped_table_name(cls, dt: Optional[datetime] = None) -> str:
        return f"scraped_on_{cls.format_date_suffix(dt)}"

    @classmethod
    def get_index_table_name(cls, dt: Optional[datetime] = None) -> str:
        return f"index_for_{cls.format_date_suffix(dt)}"

    @classmethod
    async def resolve_active_scraped_table(cls) -> Tuple[str, bool]:
        """
        Dynamically finds the latest available scraped table by probing today and past days.
        Caches outcome to avoid redundant network probes.
        Returns: (table_name, is_live_db)
        """
        import time
        if cls._cached_scraped is not None and (time.time() - cls._cached_scraped_time < cls.CACHE_TTL):
            return cls._cached_scraped

        client = cls.get_client()
        if not client:
            cls._cached_scraped = (cls.get_scraped_table_name(), False)
            return cls._cached_scraped

        now = datetime.now()
        for offset in range(8):
            test_date = now - timedelta(days=offset)
            table_name = cls.get_scraped_table_name(test_date)
            try:
                res = client.table(table_name).select("ID", count="exact").limit(1).execute()
                if res.data is not None:
                    cls._cached_scraped = (table_name, True)
                    cls._cached_scraped_time = time.time()
                    return cls._cached_scraped
            except Exception:
                continue

        cls._cached_scraped = (cls.get_scraped_table_name(), False)
        cls._cached_scraped_time = time.time()
        return cls._cached_scraped



    @classmethod
    async def resolve_active_index_table(cls) -> Tuple[str, bool]:
        """
        Dynamically finds the latest available index table by probing today and past days.
        Caches outcome to avoid redundant network probes.
        Returns: (table_name, is_live_db)
        """
        import time
        if cls._cached_index is not None and (time.time() - cls._cached_index_time < cls.CACHE_TTL):
            return cls._cached_index

        client = cls.get_client()
        if not client:
            cls._cached_index = (cls.get_index_table_name(), False)
            return cls._cached_index

        now = datetime.now()
        for offset in range(8):
            test_date = now - timedelta(days=offset)
            table_name = cls.get_index_table_name(test_date)
            try:
                res = client.table(table_name).select("State", count="exact").limit(1).execute()
                if res.data is not None:
                    cls._cached_index = (table_name, True)
                    cls._cached_index_time = time.time()
                    return cls._cached_index
            except Exception:
                continue

        cls._cached_index = (cls.get_index_table_name(), False)
        cls._cached_index_time = time.time()
        return cls._cached_index

    @classmethod
    def load_fallback_index_data(cls) -> List[Dict[str, Any]]:
        """Fallback to api_output.json in ML directory if Supabase is offline/not configured."""
        json_path = settings.ML_DIR / "api_output.json"
        if json_path.exists():
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading fallback api_output.json: {e}")

        return [
            {"State": "All India", "Time_Horizon": "T", "MoSPI_Base": 134.2, "Basket_Inflation": "14.2%", "RealTime_APIx": 153.26},
            {"State": "All India", "Time_Horizon": "T+1", "MoSPI_Base": 134.2, "Basket_Inflation": "11.5%", "RealTime_APIx": 149.63},
            {"State": "All India", "Time_Horizon": "T+7", "MoSPI_Base": 134.2, "Basket_Inflation": "6.8%", "RealTime_APIx": 143.33},
            {"State": "All India", "Time_Horizon": "T+15", "MoSPI_Base": 134.2, "Basket_Inflation": "3.1%", "RealTime_APIx": 138.36},
            {"State": "All India", "Time_Horizon": "T+30", "MoSPI_Base": 134.2, "Basket_Inflation": "-0.8%", "RealTime_APIx": 133.13},
            {"State": "All India", "Time_Horizon": "T+45", "MoSPI_Base": 134.2, "Basket_Inflation": "-2.5%", "RealTime_APIx": 130.85},
            {"State": "Delhi", "Time_Horizon": "T", "MoSPI_Base": 138.5, "Basket_Inflation": "16.4%", "RealTime_APIx": 161.21},
            {"State": "Maharashtra", "Time_Horizon": "T", "MoSPI_Base": 132.8, "Basket_Inflation": "13.2%", "RealTime_APIx": 150.33},
            {"State": "Karnataka", "Time_Horizon": "T", "MoSPI_Base": 136.1, "Basket_Inflation": "12.0%", "RealTime_APIx": 152.43},
        ]

    @classmethod
    def get_macro_oil(cls) -> List[Dict[str, Any]]:
        client = cls.get_client()
        if client:
            try:
                res = client.table("macro_oil").select("*").execute()
                if res.data:
                    return sorted(res.data, key=lambda x: x["date"])
            except Exception as e:
                logger.warning(f"Failed to fetch macro oil from Supabase: {e}. Using fallback.")
        
        return cls.load_fallback_macro_oil()

    @classmethod
    def load_fallback_macro_oil(cls) -> List[Dict[str, Any]]:
        """Fallback to macro_indicators_db.json in ML directory."""
        json_path = settings.ML_DIR / "macro_indicators_db.json"
        if json_path.exists():
            try:
                with open(json_path, "r", encoding="utf-8") as f:
                    return json.load(f)
            except Exception as e:
                logger.error(f"Error loading macro_indicators_db.json: {e}")

        return [
            {"date": "2026-09-14", "brent_crude_usd": 73.80, "fetch_timestamp": "2026-09-14T02:17:00"},
            {"date": "2026-09-15", "brent_crude_usd": 74.25, "fetch_timestamp": "2026-09-15T02:17:00"},
            {"date": "2026-09-16", "brent_crude_usd": 73.90, "fetch_timestamp": "2026-09-16T02:17:00"},
            {"date": "2026-09-17", "brent_crude_usd": 74.60, "fetch_timestamp": "2026-09-17T02:17:00"},
            {"date": "2026-09-18", "brent_crude_usd": 75.10, "fetch_timestamp": "2026-09-18T02:17:00"},
            {"date": "2026-09-19", "brent_crude_usd": 74.85, "fetch_timestamp": "2026-09-19T02:17:00"},
        ]
