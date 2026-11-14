"""Hourly forecasts from Open-Meteo, in US units, for every point in one request."""

from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any

import httpx

from trips.adapters.http import get, json_body
from trips.domain.errors import ProviderResponseError
from trips.domain.geo import Coordinate
from trips.domain.weather import HourlyWeather, PointForecast

PROVIDER = "The weather service"
# Sustained wind at the standard 10 m; rain and showers are reported separately and both count.
HOURLY_VARIABLES = ("wind_speed_10m", "rain", "showers", "snowfall")
HOUR_FORMAT = "%Y-%m-%dT%H:%M"


class OpenMeteoWeather:
    def __init__(self, client: httpx.Client) -> None:
        self._client = client

    def hourly(
        self, points: Sequence[Coordinate], start: datetime, end: datetime
    ) -> list[PointForecast]:
        if start.tzinfo is None or end.tzinfo is None:
            raise ValueError("Start and end must include a timezone")
        if not points:
            return []
        response = get(
            self._client,
            PROVIDER,
            "/v1/forecast",
            {
                "latitude": ",".join(str(point.lat) for point in points),
                "longitude": ",".join(str(point.lon) for point in points),
                "hourly": ",".join(HOURLY_VARIABLES),
                "wind_speed_unit": "mph",
                "precipitation_unit": "inch",
                "timeformat": "unixtime",
                "timezone": "GMT",
                "start_hour": start.astimezone(UTC).strftime(HOUR_FORMAT),
                "end_hour": end.astimezone(UTC).strftime(HOUR_FORMAT),
            },
        )
        body = json_body(response, PROVIDER)
        # One point comes back as an object, several as a list.
        locations = body if isinstance(body, list) else [body]
        try:
            return [
                PointForecast(coordinate=point, hours=_hours(location["hourly"]))
                for point, location in zip(points, locations, strict=True)
            ]
        except (KeyError, TypeError, ValueError) as error:
            raise ProviderResponseError(PROVIDER) from error


def _hours(hourly: Any) -> tuple[HourlyWeather, ...]:
    return tuple(
        HourlyWeather(
            time=datetime.fromtimestamp(timestamp, UTC),
            wind_speed_mph=_reading(wind),
            rain_in=_total(_reading(rain), _reading(showers)),
            snowfall_in=_reading(snowfall),
        )
        for timestamp, wind, rain, showers, snowfall in zip(
            hourly["time"],
            hourly["wind_speed_10m"],
            hourly["rain"],
            hourly["showers"],
            hourly["snowfall"],
            strict=True,
        )
    )


def _reading(value: object) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise TypeError(f"Expected a number, got {value!r}")
    return float(value)


def _total(first: float | None, second: float | None) -> float | None:
    """Unknown if either part is unknown: a missing reading must never read as zero."""
    if first is None or second is None:
        return None
    return first + second
