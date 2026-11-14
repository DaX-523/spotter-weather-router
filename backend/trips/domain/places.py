from dataclasses import dataclass

from trips.domain.geo import Coordinate


@dataclass(frozen=True)
class Place:
    """A search result the driver can pick as origin or destination."""

    name: str
    coordinate: Coordinate
