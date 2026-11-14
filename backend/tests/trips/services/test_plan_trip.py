from dataclasses import replace
from datetime import UTC, datetime, timedelta

import pytest

from tests.fakes import (
    CHICAGO,
    DENVER,
    NOW,
    FakeRouting,
    FakeWeather,
    RouteCall,
    WeatherCall,
    make_route,
)
from trips.domain.errors import InvalidInputError
from trips.domain.geo import Coordinate
from trips.domain.ranking import Recommendation, RouteRisk
from trips.domain.risk import RiskLevel
from trips.domain.routes import Route
from trips.domain.weather import Conditions, HourlyWeather
from trips.services.plan_trip import TripPlan, TripRequest, plan_trip

LOAD_LB = 30_000
REQUEST = TripRequest(origin=CHICAGO, destination=DENVER, departure=NOW, load_weight_lb=LOAD_LB)
# A one-degree trip due north: 69.09 mi in a straight line, so checkpoints every 10 mi.
SOUTH = Coordinate(lat=30, lon=-100)
NORTH = Coordinate(lat=31, lon=-100)
NORTHBOUND = TripRequest(origin=SOUTH, destination=NORTH, departure=NOW, load_weight_lb=LOAD_LB)
NORTHBOUND_ROUTE = make_route(polyline=(SOUTH, NORTH), distance_mi=70.0, duration_s=69_094)


def plan(
    request: TripRequest = REQUEST,
    routing: FakeRouting | None = None,
    weather: FakeWeather | None = None,
) -> TripPlan:
    return plan_trip(request, routing or FakeRouting(), weather or FakeWeather(), now=NOW)


def test_asks_for_truck_routes_for_the_trip() -> None:
    routing = FakeRouting()

    plan(routing=routing)

    assert routing.calls == [RouteCall(CHICAGO, DENVER, NOW, LOAD_LB)]


@pytest.mark.parametrize(
    "departure",
    [NOW - timedelta(minutes=5), NOW + timedelta(hours=48)],
    ids=["5-minutes-ago", "48-hours-ahead"],
)
def test_accepts_departures_from_now_to_48_hours_ahead(departure: datetime) -> None:
    trip_plan = plan(replace(REQUEST, departure=departure))

    assert trip_plan.departure_at == max(departure, NOW)


@pytest.mark.parametrize(
    "departure",
    [NOW - timedelta(minutes=5, seconds=1), NOW + timedelta(hours=48, seconds=1)],
    ids=["over-5-minutes-ago", "over-48-hours-ahead"],
)
def test_rejects_departures_outside_the_window(departure: datetime) -> None:
    with pytest.raises(InvalidInputError, match="between now and 48 hours from now") as error:
        plan(replace(REQUEST, departure=departure))

    assert error.value.field == "departure_at"


def test_a_departure_moments_ago_leaves_now() -> None:
    routing = FakeRouting()

    trip_plan = plan(replace(REQUEST, departure=NOW - timedelta(minutes=3)), routing=routing)

    assert trip_plan.departure_at == NOW
    assert routing.calls[0].departure == NOW


@pytest.mark.parametrize(
    "destination",
    [CHICAGO, Coordinate(lat=CHICAGO.lat + 0.0014, lon=CHICAGO.lon)],
    ids=["same-point", "0.097-mi-away"],
)
def test_rejects_a_destination_at_the_origin(destination: Coordinate) -> None:
    with pytest.raises(InvalidInputError, match="different place from the origin") as error:
        plan(replace(REQUEST, destination=destination))

    assert error.value.field == "destination"


def test_accepts_a_destination_just_over_0_1_mi_away() -> None:
    destination = Coordinate(lat=CHICAGO.lat + 0.0015, lon=CHICAGO.lon)  # 0.104 mi
    routing = FakeRouting(result=[make_route(polyline=(CHICAGO, destination))])

    trip_plan = plan(replace(REQUEST, destination=destination), routing=routing)

    assert len(trip_plan.routes) == 1


@pytest.mark.parametrize(
    ("trip", "route", "expected_spacing_mi"),
    [
        (REQUEST, make_route(), 50),
        (NORTHBOUND, NORTHBOUND_ROUTE, 10),
    ],
    ids=["chicago-denver-920-mi", "69-mi"],
)
def test_checkpoint_spacing_follows_the_straight_line_distance(
    trip: TripRequest, route: Route, expected_spacing_mi: int
) -> None:
    trip_plan = plan(trip, routing=FakeRouting(result=[route]))

    assert trip_plan.spacing_mi == expected_spacing_mi


def test_places_checkpoints_along_each_route_with_their_etas() -> None:
    routing = FakeRouting(result=[NORTHBOUND_ROUTE])

    route = plan(NORTHBOUND, routing=routing).routes[0]

    markers = [checkpoint.mile_marker_mi for checkpoint in route.checkpoints]
    assert markers == pytest.approx([0, 10, 20, 30, 40, 50, 60, 69.0941], abs=1e-3)
    assert route.checkpoints[0].eta == NOW
    # 10 of 69.09 mi at a constant speed: 10,000 of the 69,094 seconds.
    assert route.checkpoints[1].eta == NOW + timedelta(seconds=10_000)
    assert route.checkpoints[-1].eta == NOW + timedelta(seconds=69_094)


def test_summarises_each_route() -> None:
    route = plan().routes[0]

    assert (route.id, route.distance_mi, route.duration_s) == (0, 1000.0, 54_000)
    assert route.arrival_at == datetime(2026, 11, 15, 6, 0, tzinfo=UTC)


def test_numbers_the_routes_in_the_order_the_provider_gave_them() -> None:
    routing = FakeRouting(result=[make_route(), make_route(duration_s=60_000)])

    trip_plan = plan(routing=routing)

    assert [route.id for route in trip_plan.routes] == [0, 1]


def test_fetches_weather_once_for_every_distinct_checkpoint_for_the_next_48_hours() -> None:
    routing = FakeRouting(result=[NORTHBOUND_ROUTE, NORTHBOUND_ROUTE])
    weather = FakeWeather()

    trip_plan = plan(NORTHBOUND, routing=routing, weather=weather)

    checkpoints = tuple(checkpoint.coordinate for checkpoint in trip_plan.routes[0].checkpoints)
    # Every ETA (the last is 10:11 tomorrow) falls inside the slider's 48 hours.
    assert weather.calls == [
        WeatherCall(checkpoints, start=NOW, end=datetime(2026, 11, 16, 15, tzinfo=UTC))
    ]


def test_fetches_further_ahead_when_the_trip_ends_after_48_hours() -> None:
    weather = FakeWeather()
    request = replace(NORTHBOUND, departure=NOW + timedelta(hours=48))

    plan(request, routing=FakeRouting(result=[NORTHBOUND_ROUTE]), weather=weather)

    # The last ETA is 10:11:34 on the 17th; its rain and snow are in the hour ending at 11:00.
    assert (weather.calls[0].start, weather.calls[0].end) == (
        NOW,
        datetime(2026, 11, 17, 11, tzinfo=UTC),
    )


def test_rates_the_corridor_around_every_checkpoint_for_the_next_48_hours() -> None:
    routing = FakeRouting(result=[NORTHBOUND_ROUTE, NORTHBOUND_ROUTE])

    corridor = plan(NORTHBOUND, routing=routing, weather=steady_wind(30)).corridor

    assert corridor.start_at == NOW
    assert len(corridor.points) == 8
    assert {len(point.levels) for point in corridor.points} == {49}
    assert {level for point in corridor.points for level in point.levels} == {RiskLevel.MODERATE}


def test_each_checkpoint_gets_the_weather_at_its_eta() -> None:
    def by_hour(_: Coordinate, time: datetime) -> HourlyWeather:
        return HourlyWeather(time, wind_speed_mph=time.hour, rain_in=time.hour / 100, snowfall_in=0)

    request = replace(REQUEST, departure=NOW + timedelta(minutes=20))

    origin = plan(request, weather=FakeWeather(readings=by_hour)).routes[0].checkpoints[0]

    # 15:20: wind at 15:00, the nearest hour; rain for 15:00 to 16:00, labelled 16:00.
    assert origin.conditions == Conditions(wind_speed_mph=15, rain_in=0.16, snowfall_in=0)


def test_draws_a_simplified_line_but_places_checkpoints_on_the_full_one() -> None:
    on_the_way = Coordinate(lat=30.5, lon=-100)
    routing = FakeRouting(result=[replace(NORTHBOUND_ROUTE, polyline=(SOUTH, on_the_way, NORTH))])

    route = plan(NORTHBOUND, routing=routing).routes[0]

    assert route.polyline == (SOUTH, NORTH)
    assert len(route.checkpoints) == 8


def steady_wind(mph: float) -> FakeWeather:
    return FakeWeather(readings=lambda _, time: HourlyWeather(time, mph, 0, 0))


@pytest.mark.parametrize(
    ("load_lb", "expected"),
    [(30_000, RiskLevel.SEVERE), (30_001, RiskLevel.NO_TRAVEL)],
    ids=["30000-lb", "over-30000-lb"],
)
def test_rates_each_checkpoint_for_its_weather_and_the_load(
    load_lb: float, expected: RiskLevel
) -> None:
    request = replace(REQUEST, load_weight_lb=load_lb)

    route = plan(request, weather=steady_wind(48)).routes[0]

    assert {checkpoint.risk.level for checkpoint in route.checkpoints} == {expected}


def test_rates_each_route_along_its_length() -> None:
    route = plan(NORTHBOUND, routing=FakeRouting(result=[NORTHBOUND_ROUTE])).routes[0]

    assert route.risk == RouteRisk(
        level=RiskLevel.LOW, no_travel_mi=0, severe_mi=0, high_mi=0, average_score=0
    )


def test_recommends_the_safer_route_over_the_faster_one() -> None:
    def snow_west_of_100_5(point: Coordinate, time: datetime) -> HourlyWeather:
        return HourlyWeather(time, 5, 0, snowfall_in=2.5 if point.lon < -100.5 else 0)

    westward = make_route(
        polyline=(SOUTH, Coordinate(lat=30.5, lon=-101), NORTH), duration_s=60_000
    )
    routing = FakeRouting(result=[westward, NORTHBOUND_ROUTE])

    trip_plan = plan(NORTHBOUND, routing=routing, weather=FakeWeather(snow_west_of_100_5))

    assert trip_plan.routes[0].risk.severe_mi > 0
    assert trip_plan.recommendation == Recommendation(1, "Fewest miles in severe conditions")


def test_recommends_no_route_when_every_route_has_no_travel_conditions() -> None:
    trip_plan = plan(weather=steady_wind(60))

    assert trip_plan.recommendation.route_id is None
