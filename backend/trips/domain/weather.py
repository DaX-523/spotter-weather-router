from dataclasses import dataclass
from datetime import datetime

from trips.domain.geo import Coordinate
from trips.domain.timing import end_of_hour, nearest_hour


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


@dataclass(frozen=True)
class Conditions:
    """The weather a truck meets at one place and moment. None means unknown, never calm."""

    wind_speed_mph: float | None
    rain_in: float | None
    snowfall_in: float | None


def conditions_at(forecast: PointForecast, moment: datetime) -> Conditions:
    """Wind from the hour nearest to `moment`; rain and snow from the hour the truck is in."""
    by_time = {hour.time: hour for hour in forecast.hours}
    wind_hour = by_time.get(nearest_hour(moment))
    totals_hour = by_time.get(end_of_hour(moment))
    return Conditions(
        wind_speed_mph=wind_hour.wind_speed_mph if wind_hour else None,
        rain_in=totals_hour.rain_in if totals_hour else None,
        snowfall_in=totals_hour.snowfall_in if totals_hour else None,
    )
