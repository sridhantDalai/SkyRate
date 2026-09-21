import asyncio, time
from typing import Any, Callable, Dict, Optional
from functools import wraps
from app.core.logging import logger


class TTL:
    """Centralised TTL constants (seconds). Edit here; effective everywhere."""
    METADATA: int = 86400         # 24 h  – airports, carriers, horizons
    ROUTES: int = 3600            # 1 h   – monitored corridor list
    ROUTE_DETAIL: int = 3600      # 1 h   – per-route detail
    INDEX_OVERVIEW: int = 1800    # 30 min – daily ML index (partition-tagged)
    INDEX_LATEST: int = 1800      # 30 min – paginated index records
    ANALYTICS_OVERVIEW: int = 1800 # 30 min – KPI overview (partition-tagged)
    FEE_BREAKDOWN: int = 3600     # 1 h   – static DGCA fee breakdown
    CARRIER_ANALYTICS: int = 1800  # 30 min – carrier aggregate stats
    ELASTICITY: int = 1800         # 30 min – lead-time curve
    METHODOLOGY: int = 86400      # 24 h  – static text


class _Entry:
    __slots__ = ("value", "expires_at", "partition_tag")

    def __init__(self, value: Any, ttl: int, partition_tag: Optional[str] = None):
        self.value = value
        self.expires_at: float = time.monotonic() + ttl
        self.partition_tag: Optional[str] = partition_tag

    @property
    def live(self) -> bool:
        return time.monotonic() < self.expires_at


class _TTLCache:
    def __init__(self) -> None:
        self._store: Dict[str, _Entry] = {}
        self._locks: Dict[str, asyncio.Lock] = {}
        self._hits = 0
        self._misses = 0

    def _lock(self, key: str) -> asyncio.Lock:
        if key not in self._locks:
            self._locks[key] = asyncio.Lock()
        return self._locks[key]

    # ---- synchronous read / write ------------------------------------------

    def get(self, key: str) -> Optional[Any]:
        entry = self._store.get(key)
        if entry is None:
            self._misses += 1
            return None
        if not entry.live:
            del self._store[key]
            self._misses += 1
            return None
        self._hits += 1
        return entry.value

    def set(self, key: str, value: Any, ttl: int,
            partition_tag: Optional[str] = None) -> None:
        self._store[key] = _Entry(value, ttl, partition_tag)
        logger.debug(f"[cache] SET {key!r} ttl={ttl}s tag={partition_tag!r}")

    def delete(self, key: str) -> None:
        self._store.pop(key, None)

    # ---- invalidation -------------------------------------------------------

    def invalidate_partition(self, table_name: str) -> int:
        """Evict every key tagged to a specific Supabase partition table."""
        victims = [k for k, e in self._store.items()
                   if e.partition_tag == table_name]
        for k in victims:
            del self._store[k]
        if victims:
            logger.info(
                f"[cache] INVALIDATED {len(victims)} keys for partition={table_name!r}"
            )
        return len(victims)

    def invalidate_prefix(self, prefix: str) -> int:
        """Evict all keys that start with *prefix*."""
        victims = [k for k in self._store if k.startswith(prefix)]
        for k in victims:
            del self._store[k]
        if victims:
            logger.info(
                f"[cache] INVALIDATED {len(victims)} keys prefix={prefix!r}"
            )
        return len(victims)

    def clear(self) -> None:
        n = len(self._store)
        self._store.clear()
        logger.info(f"[cache] CLEARED {n} entries")

    # ---- diagnostics --------------------------------------------------------

    def stats(self) -> Dict[str, Any]:
        live = sum(1 for e in self._store.values() if e.live)
        total_req = self._hits + self._misses
        return {
            "live_entries": live,
            "expired_entries": len(self._store) - live,
            "total_entries": len(self._store),
            "hits": self._hits,
            "misses": self._misses,
            "hit_rate_pct": (
                round(self._hits / total_req * 100, 1) if total_req else 0.0
            ),
        }

    # ---- async stampede-safe fetch -----------------------------------------

    async def get_or_fetch(
        self,
        key: str,
        fetcher: Callable,
        ttl: int,
        partition_tag: Optional[str] = None,
    ) -> Any:
        """Return cached value; on miss call fetcher() exactly once per key."""
        value = self.get(key)
        if value is not None:
            return value
        async with self._lock(key):
            value = self.get(key)          # double-check inside lock
            if value is not None:
                return value
            logger.debug(f"[cache] FETCH {key!r}")
            value = await fetcher()
            if value is not None:
                self.set(key, value, ttl, partition_tag)
            return value


# Module-level singleton
cache = _TTLCache()


def cached(key: str, ttl: int, partition_tag: Optional[str] = None):
    """Decorator: wrap an async function with get_or_fetch caching."""
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        async def wrapper(*args, **kwargs):
            return await cache.get_or_fetch(
                key=key,
                fetcher=lambda: func(*args, **kwargs),
                ttl=ttl,
                partition_tag=partition_tag,
            )
        return wrapper
    return decorator
