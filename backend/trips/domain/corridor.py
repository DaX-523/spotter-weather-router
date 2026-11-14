"""The risk along the trip corridor for each hour from now to 48 hours ahead: what the map's
heatmap shows as the driver moves the slider (artifacts/REQUIREMENTS.md)."""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta

from trips.domain.geo import Coordinate
from trips.domain.risk import Hazard, RiskLevel, assess_checkpoint
from trips.domain.weather import PointForecast, conditions_at

# The owner's slider: from now (hour 0) to 48 hours ahead, inclusive.
CORRIDOR_HOURS = 48
ONE_HOUR = timedelta(hours=1)


@dataclass(frozen=True)
class CorridorPoint:
    coordinate: Coordinate
    # One entry each per hour, starting at the corridor's start: the level, and the conditions
    # that make it more than Low, worst first (as at a checkpoint).
    levels: tuple[RiskLevel, ...]
    hazards: tuple[tuple[Hazard, ...], ...]


@dataclass(frozen=True)
class Corridor:
    start_at: datetime
    points: tuple[CorridorPoint, ...]


def corridor_risk(
    forecasts: Mapping[Coordinate, PointForecast], start_at: datetime, load_weight_lb: float
) -> Corridor:
    """Each point's risk on every hour from `start_at`, by the same rules as the routes: the wind
    at that hour, the rain and snow of the hour ending then, and the load."""
    hours = [start_at + offset * ONE_HOUR for offset in range(CORRIDOR_HOURS + 1)]
    return Corridor(
        start_at=start_at,
        points=tuple(
            _rated_point(coordinate, forecast, hours, load_weight_lb)
            for coordinate, forecast in forecasts.items()
        ),
    )


def _rated_point(
    coordinate: Coordinate,
    forecast: PointForecast,
    hours: Sequence[datetime],
    load_weight_lb: float,
) -> CorridorPoint:
    risks = [assess_checkpoint(conditions_at(forecast, hour), load_weight_lb) for hour in hours]
    return CorridorPoint(
        coordinate,
        levels=tuple(risk.level for risk in risks),
        hazards=tuple(risk.hazards for risk in risks),
    )
