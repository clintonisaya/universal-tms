"""Simple TTL cache for dashboard aggregates.

Thread-safe, process-local cache that avoids the need for an external
Redis dependency while still preventing redundant heavy queries on every
page load.

Usage::

    from app.core.cache import dashboard_cache

    # Read-through: returns cached value or calls the factory
    data = dashboard_cache.get_or_set("dashboard:stats", build_stats, ttl=300)

    # Explicit invalidation
    dashboard_cache.invalidate("dashboard:stats")
    dashboard_cache.invalidate_prefix("dashboard:")
"""

from __future__ import annotations

import time
from collections.abc import Callable
from threading import Lock
from typing import TypeVar

T = TypeVar("T")


class TTLCache:
    """Dead-simple process-local TTL cache with prefix invalidation."""

    def __init__(self) -> None:
        self._store: dict[str, tuple[float, object]] = {}
        self._lock = Lock()

    def get(self, key: str) -> object | None:
        with self._lock:
            entry = self._store.get(key)
            if entry is None:
                return None
            expires_at, value = entry
            if time.monotonic() > expires_at:
                del self._store[key]
                return None
            return value

    def set(self, key: str, value: object, ttl: int = 300) -> None:
        with self._lock:
            self._store[key] = (time.monotonic() + ttl, value)

    def get_or_set(self, key: str, factory: Callable[[], T], ttl: int = 300) -> T:
        """Return cached value or call *factory*, cache, and return."""
        cached = self.get(key)
        if cached is not None:
            return cached  # type: ignore[return-value]
        value = factory()
        self.set(key, value, ttl)
        return value

    def invalidate(self, key: str) -> None:
        with self._lock:
            self._store.pop(key, None)

    def invalidate_prefix(self, prefix: str) -> None:
        with self._lock:
            keys = [k for k in self._store if k.startswith(prefix)]
            for k in keys:
                del self._store[k]


# Module-level singleton – one cache per worker process.
dashboard_cache = TTLCache()
