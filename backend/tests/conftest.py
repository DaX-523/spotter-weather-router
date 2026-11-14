import pytest
from rest_framework.test import APIClient

from tests.fakes import NOW, FakePlaceSearch, FakeRouting, FakeTimeZones, FakeWeather
from trips import wiring


@pytest.fixture
def fake_routing() -> FakeRouting:
    return FakeRouting()


@pytest.fixture
def fake_place_search() -> FakePlaceSearch:
    return FakePlaceSearch()


@pytest.fixture
def fake_weather() -> FakeWeather:
    return FakeWeather()


@pytest.fixture
def api_client(
    monkeypatch: pytest.MonkeyPatch,
    fake_routing: FakeRouting,
    fake_place_search: FakePlaceSearch,
    fake_weather: FakeWeather,
) -> APIClient:
    """The real URLs and views, with fakes behind the wiring seam and the clock frozen at NOW."""
    providers = wiring.Providers(
        routing=fake_routing,
        place_search=fake_place_search,
        weather=fake_weather,
        time_zones=FakeTimeZones(),
        clock=lambda: NOW,
    )
    monkeypatch.setattr(wiring, "providers", lambda: providers)
    return APIClient()
