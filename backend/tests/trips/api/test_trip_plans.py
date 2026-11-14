from typing import Any

import pytest
from rest_framework.test import APIClient

from tests.fakes import FakeRouting, FakeWeather
from trips.domain.errors import (
    DomainError,
    NoRouteFoundError,
    ProviderResponseError,
    ProviderUnavailableError,
)
from trips.domain.weather import HourlyWeather

URL = "/api/v1/trip-plans"
CHICAGO = {"lat": 41.8781, "lon": -87.6298}
DENVER = {"lat": 39.7392, "lon": -104.9903}
VALID: dict[str, Any] = {
    "origin": CHICAGO,
    "destination": DENVER,
    "departure_at": "2026-11-14T15:00:00Z",
    "load_weight_lb": 30_000,
}


def test_plans_routes_with_checkpoints_etas_and_weather(api_client: APIClient) -> None:
    response = api_client.post(URL, VALID, format="json")

    assert response.status_code == 200
    body = response.json()
    assert (body["departure_at"], body["spacing_mi"]) == ("2026-11-14T15:00:00Z", 50)
    route = body["routes"][0]
    assert {key: route[key] for key in ("id", "distance_mi", "duration_s", "arrival_at")} == {
        "id": 0,
        "distance_mi": 1000.0,
        "duration_s": 54_000,
        "arrival_at": "2026-11-15T06:00:00Z",
    }
    assert route["polyline"] == [CHICAGO, DENVER]
    assert route["checkpoints"][0] == {
        "coordinate": CHICAGO,
        "mile_marker_mi": 0.0,
        "eta": "2026-11-14T15:00:00Z",
        "weather": {"wind_speed_mph": 5.0, "rain_in": 0.0, "snowfall_in": 0.0},
        "risk": {"level": "low", "hazards": []},
        "time_zone": "America/Chicago",
    }


def test_names_the_time_zones_times_should_be_shown_in(api_client: APIClient) -> None:
    body = api_client.post(URL, VALID, format="json").json()

    assert (body["origin_time_zone"], body["destination_time_zone"]) == (
        "America/Chicago",
        "America/Denver",
    )


@pytest.mark.parametrize("load_lb", [1, 80_000], ids=["one-pound", "federal-limit"])
def test_accepts_loads_up_to_the_federal_limit(api_client: APIClient, load_lb: int) -> None:
    response = api_client.post(URL, VALID | {"load_weight_lb": load_lb}, format="json")

    assert response.status_code == 200


@pytest.mark.parametrize(
    ("load", "message"),
    [
        (80_000.1, "Load weight can be at most 80,000 lb, the federal limit."),
        (183_024_823_092_434, "Load weight can be at most 80,000 lb, the federal limit."),
        (0, "Load weight must be more than 0 lb."),
        ("NaN", "A valid number is required."),
    ],
    ids=["just-over-the-limit", "billions", "zero", "not-a-number"],
)
def test_rejects_loads_outside_the_legal_range(
    api_client: APIClient, load: float | str, message: str
) -> None:
    response = api_client.post(URL, VALID | {"load_weight_lb": load}, format="json")

    assert response.status_code == 400
    assert response.json() == {"load_weight_lb": [message]}


def test_rates_each_route_and_recommends_one(api_client: APIClient) -> None:
    response = api_client.post(URL, VALID, format="json")

    body = response.json()
    assert body["routes"][0]["risk"] == {
        "level": "low",
        "no_travel_mi": 0.0,
        "severe_mi": 0.0,
        "high_mi": 0.0,
        "average_score": 0.0,
    }
    assert body["recommendation"] == {"route_id": 0, "reason": "The only route found"}


def test_rates_the_corridor_hour_by_hour_for_the_heatmap(api_client: APIClient) -> None:
    response = api_client.post(URL, VALID, format="json")

    corridor = response.json()["corridor"]
    assert corridor["start_at"] == "2026-11-14T15:00:00Z"
    assert corridor["points"][0] == {"coordinate": CHICAGO, "levels": ["low"] * 49}


def test_compresses_the_plan_for_clients_that_accept_it(api_client: APIClient) -> None:
    response = api_client.post(URL, VALID, format="json", HTTP_ACCEPT_ENCODING="gzip")

    assert response["Content-Encoding"] == "gzip"


def test_explains_the_hazards_at_each_checkpoint(
    api_client: APIClient, fake_weather: FakeWeather
) -> None:
    fake_weather.readings = lambda _, time: HourlyWeather(time, 48, 0, 0)

    response = api_client.post(URL, VALID | {"load_weight_lb": 35_000}, format="json")

    body = response.json()
    assert body["routes"][0]["checkpoints"][0]["risk"] == {
        "level": "no_travel",
        "hazards": [
            {
                "kind": "wind",
                "level": "no_travel",
                "reason": "Wind 48 mph with a load over 30,000 lb",
            }
        ],
    }
    assert body["recommendation"] == {
        "route_id": None,
        "reason": "Every route crosses No Travel conditions. Try a later departure.",
    }


@pytest.mark.parametrize(
    ("changes", "field"),
    [
        ({"origin": None}, "origin"),
        ({"origin": [41.8781, -87.6298]}, "origin"),
        ({"origin": {"lat": 91, "lon": 0}}, "origin"),
        ({"destination": {"lat": 0, "lon": -181}}, "destination"),
        ({"departure_at": "tomorrow"}, "departure_at"),
        ({"load_weight_lb": 0}, "load_weight_lb"),
        ({"load_weight_lb": "heavy"}, "load_weight_lb"),
    ],
    ids=[
        "no-origin",
        "origin-as-a-bare-pair",
        "latitude-over-90",
        "longitude-under-180",
        "not-a-time",
        "no-load",
        "load-not-a-number",
    ],
)
def test_rejects_invalid_input_naming_the_field(
    api_client: APIClient, changes: dict[str, Any], field: str
) -> None:
    response = api_client.post(URL, VALID | changes, format="json")

    assert response.status_code == 400
    assert field in response.json()


def test_rejects_a_missing_field(api_client: APIClient) -> None:
    body = {key: value for key, value in VALID.items() if key != "load_weight_lb"}

    response = api_client.post(URL, body, format="json")

    assert response.status_code == 400
    assert response.json() == {"load_weight_lb": ["This field is required."]}


def test_rejects_fields_it_does_not_know(api_client: APIClient) -> None:
    response = api_client.post(URL, VALID | {"risk_level": "low"}, format="json")

    assert response.status_code == 400
    assert response.json() == {"risk_level": ["This field is not allowed."]}


def test_rejects_unknown_fields_inside_a_coordinate(api_client: APIClient) -> None:
    response = api_client.post(URL, VALID | {"origin": CHICAGO | {"alt": 180}}, format="json")

    assert response.status_code == 400
    assert response.json() == {"origin": {"alt": ["This field is not allowed."]}}


def test_a_departure_outside_the_window_is_reported_on_its_field(api_client: APIClient) -> None:
    response = api_client.post(URL, VALID | {"departure_at": "2026-11-17T15:00:00Z"}, format="json")

    assert response.status_code == 400
    assert response.json() == {
        "departure_at": ["Departure must be between now and 48 hours from now"]
    }


@pytest.mark.parametrize(
    ("error", "status_code"),
    [
        (NoRouteFoundError(), 404),
        (ProviderResponseError("The routing service"), 502),
        (ProviderUnavailableError("The routing service"), 503),
    ],
    ids=["no-route", "unreadable-answer", "not-responding"],
)
def test_routing_failures_are_explained(
    api_client: APIClient, fake_routing: FakeRouting, error: DomainError, status_code: int
) -> None:
    fake_routing.error = error

    response = api_client.post(URL, VALID, format="json")

    assert response.status_code == status_code
    assert response.json() == {"detail": str(error)}


def test_a_weather_outage_is_explained(api_client: APIClient, fake_weather: FakeWeather) -> None:
    fake_weather.error = ProviderUnavailableError("The weather service")

    response = api_client.post(URL, VALID, format="json")

    assert response.status_code == 503
    assert response.json() == {
        "detail": "The weather service is not responding right now; try again in a minute"
    }


def test_only_post_is_allowed(api_client: APIClient) -> None:
    response = api_client.get(URL)

    assert response.status_code == 405
