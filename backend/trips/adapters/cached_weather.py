"""Remembers forecasts, so planning the same or an overlapping trip again is instant and doesn't
spend the weather provider's free tier, which counts every location in a request."""

from collections.abc import Sequence
from dataclasses import replace
from datetime import UTC, datetime

from django.core.cache.backends.base import BaseCache

from trips.domain.geo import Coordinate
from trips.domain.weather import PointForecast
from trips.ports import WeatherProvider

# Two decimals is about 0.7 mi: finer than the weather models' grid, so neighbours share a forecast.
KEY_DECIMALS = 2
# Forecasts are refreshed hourly; a quarter of an hour old is still current.
TTL_S = 15 * 60


class CachedWeather:
    def __init__(self, inner: WeatherProvider, cache: BaseCache) -> None:
        self._inner = inner
        self._cache = cache

    def hourly(
        self, points: Sequence[Coordinate], start: datetime, end: datetime
    ) -> list[PointForecast]:
        keys = [_key(point, start, end) for point in points]
        found = self._cache.get_many(keys)
        missing = [point for point, key in zip(points, keys, strict=True) if key not in found]
        if missing:
            fetched = self._inner.hourly(missing, start, end)
            new = {_key(p, start, end): f for p, f in zip(missing, fetched, strict=True)}
            self._cache.set_many(new, timeout=TTL_S)
            found |= new
        # A neighbour's forecast is served under the point that was asked for.
        return [
            replace(found[key], coordinate=point) for point, key in zip(points, keys, strict=True)
        ]


def _key(point: Coordinate, start: datetime, end: datetime) -> str:
    window = f"{start.astimezone(UTC):%Y%m%d%H}-{end.astimezone(UTC):%Y%m%d%H}"
    return f"weather:{point.lat:.{KEY_DECIMALS}f},{point.lon:.{KEY_DECIMALS}f}:{window}"
