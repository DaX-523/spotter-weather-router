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
from trips.ports import RoutingProvider, TimeZoneLookup, WeatherProvider

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
    # Where the truck is at its ETA, so the ETA is shown in local time there.
    time_zone: str


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
    # Departure is shown in the origin's local time and arrival in the destination's.
    origin_time_zone: str
    destination_time_zone: str


TimedCheckpoints = list[tuple[Checkpoint, datetime]]


@dataclass(frozen=True)
class _TripContext:
    """What every route of the trip is rated against."""

    departure: datetime
    load_weight_lb: float
    forecasts: dict[Coordinate, PointForecast]
    zones: TimeZoneLookup


def plan_trip(
    request: TripRequest,
    routing: RoutingProvider,
    weather: WeatherProvider,
    zones: TimeZoneLookup,
    now: datetime,
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
    # The slider's hour 0 is now, to the minute: when the truck leaves at once, its departure.
    forecasts = _forecasts(weather, timed, now)
    context = _TripContext(departure, request.load_weight_lb, forecasts, zones)
    planned = tuple(
        _planned_route(index, route, checkpoints, context)
        for index, (route, checkpoints) in enumerate(zip(routes, timed, strict=True))
    )
    return TripPlan(
        departure_at=departure,
        spacing_mi=spacing_mi,
        routes=planned,
        recommendation=recommend(
            [RouteOption(route.id, route.risk, route.duration_s) for route in planned]
        ),
        corridor=corridor_risk(forecasts, now, request.load_weight_lb),
        origin_time_zone=zones.zone_at(request.origin),
        destination_time_zone=zones.zone_at(request.destination),
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
    weather: WeatherProvider, timed: Sequence[TimedCheckpoints], now: datetime
) -> dict[Coordinate, PointForecast]:
    """One request for every distinct checkpoint, from the hour `now` is in to the last hour the
    slider's 48 hours or any ETA needs, whichever ends later. The departure is never before now."""
    points = list(
        dict.fromkeys(checkpoint.coordinate for route in timed for checkpoint, _ in route)
    )
    latest_eta = max(eta for route in timed for _, eta in route)
    # Rain and snow are read for the hour a moment is in, which ends at or after its wind hour.
    latest = max(now + timedelta(hours=CORRIDOR_HOURS), latest_eta)
    forecasts = weather.hourly(points, start_of_hour(now), end_of_hour(latest))
    return dict(zip(points, forecasts, strict=True))


def _planned_route(
    route_id: int, route: Route, checkpoints: TimedCheckpoints, context: _TripContext
) -> PlannedRoute:
    planned = tuple(
        _planned_checkpoint(checkpoint, eta, context) for checkpoint, eta in checkpoints
    )
    return PlannedRoute(
        id=route_id,
        polyline=simplify(route.polyline, DISPLAY_TOLERANCE_MI),
        distance_mi=route.distance_mi,
        duration_s=route.duration_s,
        arrival_at=context.departure + timedelta(seconds=route.duration_s),
        checkpoints=planned,
        risk=route_risk(
            [(checkpoint.mile_marker_mi, checkpoint.risk.level) for checkpoint in planned]
        ),
    )


def _planned_checkpoint(
    checkpoint: Checkpoint, eta: datetime, context: _TripContext
) -> PlannedCheckpoint:
    conditions = conditions_at(context.forecasts[checkpoint.coordinate], eta)
    return PlannedCheckpoint(
        coordinate=checkpoint.coordinate,
        mile_marker_mi=checkpoint.mile_marker_mi,
        eta=eta,
        conditions=conditions,
        risk=assess_checkpoint(conditions, context.load_weight_lb),
        time_zone=context.zones.zone_at(checkpoint.coordinate),
    )
