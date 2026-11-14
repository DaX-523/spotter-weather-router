from dataclasses import dataclass
from datetime import datetime

from trips.domain.geo import Coordinate


@dataclass(frozen=True)
class HourlyWeather:
    """One forecast hour, labelled by `time`. The wind is the sustained wind at `time`; rain
    (including showers) and snow are the totals for the hour that ends at `time`, which makes them
    rates in inches per hour. None means the forecast has no value: unknown, never zero."""

    time: datetime
    wind_speed_mph: float | None
    rain_in: float | None
    snowfall_in: float | None


@dataclass(frozen=True)
class PointForecast:
    coordinate: Coordinate
    hours: tuple[HourlyWeather, ...]
