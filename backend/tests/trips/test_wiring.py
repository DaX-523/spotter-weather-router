from datetime import UTC

from trips import wiring
from trips.adapters.cached_weather import CachedWeather
from trips.adapters.timezone_lookup import TimezoneFinderLookup
from trips.adapters.tomtom_routing import TomTomRouting
from trips.adapters.tomtom_search import TomTomPlaceSearch


def test_builds_the_real_providers_with_a_weather_cache() -> None:
    providers = wiring.providers()

    assert isinstance(providers.routing, TomTomRouting)
    assert isinstance(providers.place_search, TomTomPlaceSearch)
    assert isinstance(providers.weather, CachedWeather)
    assert isinstance(providers.time_zones, TimezoneFinderLookup)


def test_loads_the_time_zone_data_once() -> None:
    assert wiring.providers().time_zones is wiring.providers().time_zones


def test_the_clock_tells_utc_time() -> None:
    now = wiring.providers().clock()

    assert now.tzinfo == UTC
