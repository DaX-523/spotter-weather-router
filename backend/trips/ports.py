"""What the trip planner needs from the outside world. Services depend on these Protocols only;
adapters/ implements them, and tests/fakes.py fakes them."""

from collections.abc import Sequence
from datetime import datetime
from typing import Protocol

from trips.domain.geo import Coordinate
from trips.domain.places import Place
from trips.domain.routes import Route
from trips.domain.weather import PointForecast


class RoutingProvider(Protocol):
    def routes(
        self,
        origin: Coordinate,
        destination: Coordinate,
        departure: datetime,
        load_weight_lb: float,
    ) -> list[Route]:
        """Up to three truck routes. Raises NoRouteFoundError when there are none."""
        ...


class PlaceSearch(Protocol):
    def search(self, query: str) -> list[Place]:
        """US places matching what the driver has typed so far."""
        ...


class WeatherProvider(Protocol):
    def hourly(
        self, points: Sequence[Coordinate], start: datetime, end: datetime
    ) -> list[PointForecast]:
        """Every hour from start to end for each point, in the order the points were given."""
        ...
