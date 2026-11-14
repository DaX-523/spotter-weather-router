"""Plan a trip: up to three truck routes, each with checkpoints, their ETAs, the weather the truck
will meet there and how risky it is, the route to recommend, and the corridor's risk for the
next 48 hours."""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta

from trips.domain.checkpoints import Checkpoint, checkpoint_spacing_mi, place_checkpoints
from trips.domain.corridor import CORRIDOR_HOURS, Corridor, corridor_risk
from trips.domain.errors import InvalidInputError
from trips.domain.geo import Coordinate, distance_mi
from trips.domain.polyline import simplify
from trips.domain.ranking import Recommendation, RouteOption, RouteRisk, recommend, route_risk
from trips.domain.risk import CheckpointRisk, assess_checkpoint
from trips.domain.routes import Route
from trips.domain.timing import end_of_hour, eta_at, start_of_hour
from trips.domain.weather import Conditions, PointForecast, conditions_at
from trips.ports import RoutingProvider, WeatherProvider

# Owner's window (artifacts/REQUIREMENTS.md): from now to 48 hours ahead. A departure picked a
# moment ago still counts as now: the driver's clock and ours never agree to the second.
DEPARTURE_GRACE = timedelta(minutes=5)
MAX_DEPARTURE_AHEAD = timedelta(hours=48)
# Closer than this, origin and destination are the same place.
SAME_PLACE_WITHIN_MI = 0.1
# The map's line may stray this far from the road: about 100 ft, invisible on a trip map.
DISPLAY_TOLERANCE_MI = 0.02


@dataclass(frozen=True)
class TripRequest:
    origin: Coordinate
    destination: Coordinate
    departure: datetime
    load_weight_lb: float


@dataclass(frozen=True)
class PlannedCheckpoint:
    coordinate: Coordinate
    mile_marker_mi: float
    eta: datetime
    conditions: Conditions
    risk: CheckpointRisk


@dataclass(frozen=True)
class PlannedRoute:
    id: int
    polyline: tuple[Coordinate, ...]
    distance_mi: float
    duration_s: int
    arrival_at: datetime
    checkpoints: tuple[PlannedCheckpoint, ...]
    risk: RouteRisk


@dataclass(frozen=True)
class TripPlan:
    departure_at: datetime
    spacing_mi: int
    routes: tuple[PlannedRoute, ...]
    recommendation: Recommendation
    corridor: Corridor


TimedCheckpoints = list[tuple[Checkpoint, datetime]]


def plan_trip(
    request: TripRequest, routing: RoutingProvider, weather: WeatherProvider, now: datetime
) -> TripPlan:
    departure = _departure(request.departure, now)
    straight_line_mi = distance_mi(request.origin, request.destination)
    if straight_line_mi < SAME_PLACE_WITHIN_MI:
        raise InvalidInputError(
            "destination", "Pick a destination that is a different place from the origin"
        )

    routes = routing.routes(request.origin, request.destination, departure, request.load_weight_lb)
    spacing_mi = checkpoint_spacing_mi(straight_line_mi)
    timed = [_timed_checkpoints(route, spacing_mi, departure) for route in routes]
    # The slider's hour 0. The departure is never earlier, so this also covers every ETA.
    corridor_start = start_of_hour(now)
    forecasts = _forecasts(weather, timed, corridor_start)
    planned = tuple(
        _planned_route(index, route, checkpoints, departure, forecasts, request.load_weight_lb)
        for index, (route, checkpoints) in enumerate(zip(routes, timed, strict=True))
    )
    return TripPlan(
        departure_at=departure,
        spacing_mi=spacing_mi,
        routes=planned,
        recommendation=recommend(
            [RouteOption(route.id, route.risk, route.duration_s) for route in planned]
        ),
        corridor=corridor_risk(forecasts, corridor_start, request.load_weight_lb),
    )


def _departure(requested: datetime, now: datetime) -> datetime:
    if not now - DEPARTURE_GRACE <= requested <= now + MAX_DEPARTURE_AHEAD:
        raise InvalidInputError(
            "departure_at", "Departure must be between now and 48 hours from now"
        )
    return max(requested, now)


def _timed_checkpoints(route: Route, spacing_mi: float, departure: datetime) -> TimedCheckpoints:
    checkpoints = place_checkpoints(route.polyline, spacing_mi)
    length_mi = checkpoints[-1].mile_marker_mi
    return [
        (checkpoint, eta_at(departure, route.duration_s, checkpoint.mile_marker_mi, length_mi))
        for checkpoint in checkpoints
    ]


def _forecasts(
    weather: WeatherProvider, timed: Sequence[TimedCheckpoints], corridor_start: datetime
) -> dict[Coordinate, PointForecast]:
    """One request for every distinct checkpoint, covering the slider's 48 hours and every hour
    any ETA needs, whichever ends later."""
    points = list(
        dict.fromkeys(checkpoint.coordinate for route in timed for checkpoint, _ in route)
    )
    latest_eta = max(eta for route in timed for _, eta in route)
    end = max(corridor_start + timedelta(hours=CORRIDOR_HOURS), end_of_hour(latest_eta))
    forecasts = weather.hourly(points, corridor_start, end)
    return dict(zip(points, forecasts, strict=True))


def _planned_route(
    route_id: int,
    route: Route,
    checkpoints: TimedCheckpoints,
    departure: datetime,
    forecasts: dict[Coordinate, PointForecast],
    load_weight_lb: float,
) -> PlannedRoute:
    planned = tuple(
        _planned_checkpoint(checkpoint, eta, forecasts[checkpoint.coordinate], load_weight_lb)
        for checkpoint, eta in checkpoints
    )
    return PlannedRoute(
        id=route_id,
        polyline=simplify(route.polyline, DISPLAY_TOLERANCE_MI),
        distance_mi=route.distance_mi,
        duration_s=route.duration_s,
        arrival_at=departure + timedelta(seconds=route.duration_s),
        checkpoints=planned,
        risk=route_risk(
            [(checkpoint.mile_marker_mi, checkpoint.risk.level) for checkpoint in planned]
        ),
    )


def _planned_checkpoint(
    checkpoint: Checkpoint, eta: datetime, forecast: PointForecast, load_weight_lb: float
) -> PlannedCheckpoint:
    conditions = conditions_at(forecast, eta)
    return PlannedCheckpoint(
        coordinate=checkpoint.coordinate,
        mile_marker_mi=checkpoint.mile_marker_mi,
        eta=eta,
        conditions=conditions,
        risk=assess_checkpoint(conditions, load_weight_lb),
    )
