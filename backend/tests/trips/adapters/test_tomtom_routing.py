from datetime import UTC, datetime

import httpx
import pytest

from tests.provider_stubs import StubServer, stub_json
from trips.adapters.tomtom_routing import TomTomRouting
from trips.domain.errors import NoRouteFoundError, ProviderResponseError
from trips.domain.geo import Coordinate
from trips.ports import RoutingProvider

API_KEY = "test-key"
CHICAGO = Coordinate(lat=41.8781, lon=-87.6298)
DENVER = Coordinate(lat=39.7392, lon=-104.9903)
DEPARTURE = datetime(2026, 11, 14, 15, 0, tzinfo=UTC)
LOAD_LB = 30_000


def routing_for(server: StubServer) -> RoutingProvider:
    return TomTomRouting(server.client(), api_key=API_KEY)


def ok(body: object) -> StubServer:
    return StubServer(httpx.Response(200, json=body))


def tomtom_error(code: str) -> StubServer:
    body = {"formatVersion": "0.0.12", "detailedError": {"code": code, "message": "Explained"}}
    return StubServer(httpx.Response(400, json=body))


def test_asks_for_three_truck_routes_that_respect_the_load_and_departure() -> None:
    server = ok(stub_json("tomtom/calculate_route.json"))

    routing_for(server).routes(CHICAGO, DENVER, DEPARTURE, LOAD_LB)

    request = server.requests[0]
    assert request.url.path == "/routing/1/calculateRoute/41.8781,-87.6298:39.7392,-104.9903/json"
    assert dict(request.url.params) == {
        "key": API_KEY,
        "travelMode": "truck",
        "vehicleWeight": "13608",
        "maxAlternatives": "2",
        "departAt": "2026-11-14T15:00:00+00:00",
    }


@pytest.mark.parametrize(
    ("load_lb", "expected_kg"),
    [(1, "1"), (30_000, "13608"), (80_000, "36288")],
    ids=["one-pound", "typical-load", "heavy-load"],
)
def test_sends_the_load_in_whole_kilograms_rounded_up(load_lb: float, expected_kg: str) -> None:
    server = ok(stub_json("tomtom/calculate_route.json"))

    routing_for(server).routes(CHICAGO, DENVER, DEPARTURE, load_lb)

    assert server.requests[0].url.params["vehicleWeight"] == expected_kg


def test_converts_each_route_to_miles_seconds_and_a_polyline() -> None:
    server = ok(stub_json("tomtom/calculate_route.json"))

    routes = routing_for(server).routes(CHICAGO, DENVER, DEPARTURE, LOAD_LB)

    assert len(routes) == 3
    assert routes[0].polyline == (CHICAGO, Coordinate(lat=41.2, lon=-95.9), DENVER)
    assert routes[0].distance_mi == pytest.approx(1000)
    assert routes[0].duration_s == 54_000
    assert [route.duration_s for route in routes] == [54_000, 55_800, 57_600]


def test_returns_fewer_routes_when_tomtom_finds_fewer() -> None:
    body = stub_json("tomtom/calculate_route.json")
    body["routes"] = body["routes"][:1]
    server = ok(body)

    routes = routing_for(server).routes(CHICAGO, DENVER, DEPARTURE, LOAD_LB)

    assert len(routes) == 1


def test_an_empty_route_list_means_no_route_was_found() -> None:
    server = ok({"formatVersion": "0.0.12", "routes": []})

    with pytest.raises(NoRouteFoundError, match="No truck route was found between these places"):
        routing_for(server).routes(CHICAGO, DENVER, DEPARTURE, LOAD_LB)


@pytest.mark.parametrize("code", ["NO_ROUTE_FOUND", "MAP_MATCHING_FAILURE"])
def test_tomtom_saying_there_is_no_route_means_no_route_was_found(code: str) -> None:
    server = tomtom_error(code)

    with pytest.raises(NoRouteFoundError):
        routing_for(server).routes(CHICAGO, DENVER, DEPARTURE, LOAD_LB)


def test_any_other_bad_request_is_a_provider_response_error() -> None:
    server = tomtom_error("BAD_INPUT")

    with pytest.raises(ProviderResponseError):
        routing_for(server).routes(CHICAGO, DENVER, DEPARTURE, LOAD_LB)


def test_a_route_with_a_single_point_is_a_provider_response_error() -> None:
    body = stub_json("tomtom/calculate_route.json")
    body["routes"][0]["legs"][0]["points"] = [{"latitude": 41.8781, "longitude": -87.6298}]
    server = ok(body)

    with pytest.raises(ProviderResponseError):
        routing_for(server).routes(CHICAGO, DENVER, DEPARTURE, LOAD_LB)
