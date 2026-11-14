import pytest
from rest_framework.test import APIClient

from tests.fakes import FakePlaceSearch
from trips.domain.errors import ProviderUnavailableError

URL = "/api/v1/places"


def test_suggests_places_for_what_the_driver_typed(
    api_client: APIClient, fake_place_search: FakePlaceSearch
) -> None:
    response = api_client.get(URL, {"query": "  Chica "})

    assert response.status_code == 200
    assert response.json() == [
        {
            "name": "Chicago, IL",
            "coordinate": {"lat": 41.8781, "lon": -87.6298},
            "time_zone": "America/Chicago",
        }
    ]
    assert fake_place_search.queries == ["Chica"]


@pytest.mark.parametrize(
    "params", [{}, {"query": "C"}, {"query": " C "}], ids=["missing", "one-letter", "padded"]
)
def test_needs_at_least_two_letters(api_client: APIClient, params: dict[str, str]) -> None:
    response = api_client.get(URL, params)

    assert response.status_code == 400
    assert "query" in response.json()


def test_rejects_parameters_it_does_not_know(api_client: APIClient) -> None:
    response = api_client.get(URL, {"query": "Chicago", "country": "CA"})

    assert response.status_code == 400
    assert response.json() == {"country": ["This field is not allowed."]}


def test_a_search_outage_is_explained(
    api_client: APIClient, fake_place_search: FakePlaceSearch
) -> None:
    fake_place_search.error = ProviderUnavailableError("The place search service")

    response = api_client.get(URL, {"query": "Chicago"})

    assert response.status_code == 503
