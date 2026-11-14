from collections.abc import Iterator
from datetime import timedelta

import pytest
from django.core.cache.backends.locmem import LocMemCache

from tests.fakes import CHICAGO, DENVER, NOW, FakeWeather
from trips.adapters.cached_weather import CachedWeather
from trips.domain.errors import ProviderUnavailableError
from trips.domain.geo import Coordinate

LATER = NOW + timedelta(hours=2)


@pytest.fixture
def cache() -> Iterator[LocMemCache]:
    cache = LocMemCache("weather-cache-tests", {})
    cache.clear()
    yield cache
    cache.clear()


def test_a_repeated_request_is_served_from_the_cache(cache: LocMemCache) -> None:
    inner = FakeWeather()
    weather = CachedWeather(inner, cache)

    first = weather.hourly([CHICAGO, DENVER], NOW, LATER)
    second = weather.hourly([CHICAGO, DENVER], NOW, LATER)

    assert second == first
    assert len(inner.calls) == 1


def test_points_a_few_hundred_feet_apart_share_a_forecast(cache: LocMemCache) -> None:
    inner = FakeWeather()
    weather = CachedWeather(inner, cache)
    nearby = Coordinate(lat=41.8789, lon=-87.6301)  # rounds to the same 41.88, -87.63

    weather.hourly([CHICAGO], NOW, LATER)
    forecasts = weather.hourly([nearby], NOW, LATER)

    assert len(inner.calls) == 1
    assert forecasts[0].coordinate == nearby


def test_only_points_not_in_the_cache_are_fetched(cache: LocMemCache) -> None:
    inner = FakeWeather()
    weather = CachedWeather(inner, cache)

    weather.hourly([CHICAGO], NOW, LATER)
    forecasts = weather.hourly([CHICAGO, DENVER], NOW, LATER)

    assert inner.calls[1].points == (DENVER,)
    assert [forecast.coordinate for forecast in forecasts] == [CHICAGO, DENVER]


def test_a_different_window_is_fetched_again(cache: LocMemCache) -> None:
    inner = FakeWeather()
    weather = CachedWeather(inner, cache)

    weather.hourly([CHICAGO], NOW, LATER)
    weather.hourly([CHICAGO], NOW, LATER + timedelta(hours=1))

    assert len(inner.calls) == 2


def test_nothing_is_cached_when_the_provider_fails(cache: LocMemCache) -> None:
    inner = FakeWeather(error=ProviderUnavailableError("The weather service"))
    weather = CachedWeather(inner, cache)
    with pytest.raises(ProviderUnavailableError):
        weather.hourly([CHICAGO], NOW, LATER)
    inner.error = None

    weather.hourly([CHICAGO], NOW, LATER)

    assert len(inner.calls) == 2
