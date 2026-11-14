from dataclasses import dataclass

from trips.domain.geo import Coordinate


@dataclass(frozen=True)
class Route:
    """One way to drive from origin to destination, as the routing provider computed it."""

    polyline: tuple[Coordinate, ...]
    distance_mi: float
    duration_s: int

    def __post_init__(self) -> None:
        if len(self.polyline) < 2:
            raise ValueError("A route needs at least two points")
