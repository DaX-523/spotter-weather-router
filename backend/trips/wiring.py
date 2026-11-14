"""Builds the real providers from settings: the only module that does. Views get everything from
`providers()`, which is the seam tests replace with fakes."""

from collections.abc import Callable
from dataclasses import dataclass
from datetime import datetime
from functools import cache

import httpx
from django.conf import settings
from django.core.cache import caches
from django.utils import timezone

from trips.adapters.cached_weather import CachedWeather
from trips.adapters.open_meteo import OpenMeteoWeather
from trips.adapters.tomtom_routing import TomTomRouting
from trips.adapters.tomtom_search import TomTomPlaceSearch
from trips.ports import PlaceSearch, RoutingProvider, WeatherProvider


@dataclass(frozen=True)
class Providers:
    routing: RoutingProvider
    place_search: PlaceSearch
    weather: WeatherProvider
    clock: Callable[[], datetime]


def providers() -> Providers:
    tomtom = _client(settings.TOMTOM_BASE_URL)
    return Providers(
        routing=TomTomRouting(tomtom, settings.TOMTOM_API_KEY),
        place_search=TomTomPlaceSearch(tomtom, settings.TOMTOM_API_KEY),
        weather=CachedWeather(
            OpenMeteoWeather(_client(settings.OPEN_METEO_BASE_URL)), caches["default"]
        ),
        clock=timezone.now,
    )


@cache
def _client(base_url: str) -> httpx.Client:
    """One pooled client per provider host, shared by every request."""
    return httpx.Client(base_url=base_url, timeout=settings.PROVIDER_TIMEOUT_S)
