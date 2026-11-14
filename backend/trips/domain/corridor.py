"""The risk along the trip corridor for each hour from now to 48 hours ahead: what the map's
heatmap shows as the driver moves the slider (artifacts/REQUIREMENTS.md)."""

from collections.abc import Mapping
from dataclasses import dataclass
from datetime import datetime, timedelta

from trips.domain.geo import Coordinate
from trips.domain.risk import RiskLevel, assess_checkpoint
from trips.domain.weather import PointForecast, conditions_at

# The owner's slider: from now (hour 0) to 48 hours ahead, inclusive.
CORRIDOR_HOURS = 48
ONE_HOUR = timedelta(hours=1)


@dataclass(frozen=True)
class CorridorPoint:
    coordinate: Coordinate
    # One level per hour, starting at the corridor's start.
    levels: tuple[RiskLevel, ...]


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
            CorridorPoint(
                coordinate,
                tuple(
                    assess_checkpoint(conditions_at(forecast, hour), load_weight_lb).level
                    for hour in hours
                ),
            )
            for coordinate, forecast in forecasts.items()
        ),
    )
