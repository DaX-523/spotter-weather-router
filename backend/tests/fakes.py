"""In-memory stand-ins for the ports, for service and API tests that need no network. Each fake
records its calls, and can be told to fail with a domain error."""

from collections.abc import Callable, Sequence
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from typing import Any

from trips.domain.errors import DomainError
from trips.domain.geo import Coordinate
from trips.domain.places import Place
from trips.domain.routes import Route
from trips.domain.weather import HourlyWeather, PointForecast

# The clock for every test that plans a trip.
NOW = datetime(2026, 11, 14, 15, 0, tzinfo=UTC)
CHICAGO = Coordinate(lat=41.8781, lon=-87.6298)
DENVER = Coordinate(lat=39.7392, lon=-104.9903)
ONE_HOUR = timedelta(hours=1)


def make_route(**overrides: Any) -> Route:
    fields: dict[str, Any] = {
        "polyline": (CHICAGO, DENVER),
        "distance_mi": 1000.0,
        "duration_s": 54_000,
    }
    return Route(**(fields | overrides))


@dataclass(frozen=True)
class RouteCall:
    origin: Coordinate
    destination: Coordinate
    departure: datetime
    load_weight_lb: float


@dataclass
class FakeRouting:
    result: list[Route] = field(default_factory=lambda: [make_route()])
    error: DomainError | None = None
    calls: list[RouteCall] = field(default_factory=list)

    def routes(
        self,
        origin: Coordinate,
        destination: Coordinate,
        departure: datetime,
        load_weight_lb: float,
    ) -> list[Route]:
        self.calls.append(RouteCall(origin, destination, departure, load_weight_lb))
        if self.error:
            raise self.error
        return self.result


@dataclass
class FakePlaceSearch:
    result: list[Place] = field(default_factory=lambda: [Place("Chicago, IL", CHICAGO)])
    error: DomainError | None = None
    queries: list[str] = field(default_factory=list)

    def search(self, query: str) -> list[Place]:
        self.queries.append(query)
        if self.error:
            raise self.error
        return self.result


Readings = Callable[[Coordinate, datetime], HourlyWeather]


def calm(_: Coordinate, time: datetime) -> HourlyWeather:
    return HourlyWeather(time=time, wind_speed_mph=5.0, rain_in=0.0, snowfall_in=0.0)


@dataclass(frozen=True)
class WeatherCall:
    points: tuple[Coordinate, ...]
    start: datetime
    end: datetime


@dataclass
class FakeWeather:
    """Answers every hour from start to end, inclusive, with `readings(point, hour)`."""

    readings: Readings = calm
    error: DomainError | None = None
    calls: list[WeatherCall] = field(default_factory=list)

    def hourly(
        self, points: Sequence[Coordinate], start: datetime, end: datetime
    ) -> list[PointForecast]:
        self.calls.append(WeatherCall(tuple(points), start, end))
        if self.error:
            raise self.error
        hour_count = int((end - start) / ONE_HOUR) + 1
        hours = [start + offset * ONE_HOUR for offset in range(hour_count)]
        return [
            PointForecast(point, tuple(self.readings(point, hour) for hour in hours))
            for point in points
        ]
