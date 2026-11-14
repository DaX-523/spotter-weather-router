"""Points on the map and the distances between them, in miles."""

import math
from dataclasses import dataclass

# Mean Earth radius (IUGG): 6,371.0088 km.
EARTH_RADIUS_MI = 3958.8
MAX_LATITUDE = 90
MAX_LONGITUDE = 180


@dataclass(frozen=True)
class Coordinate:
    """A WGS84 point. Always named, never a bare (lat, lon) tuple: vendors disagree on the order."""

    lat: float
    lon: float

    def __post_init__(self) -> None:
        # Written as `not inside` so that NaN, which fails every comparison, is rejected too.
        if not -MAX_LATITUDE <= self.lat <= MAX_LATITUDE:
            raise ValueError(f"Latitude {self.lat} is outside -90..90")
        if not -MAX_LONGITUDE <= self.lon <= MAX_LONGITUDE:
            raise ValueError(f"Longitude {self.lon} is outside -180..180")


def distance_mi(a: Coordinate, b: Coordinate) -> float:
    """Great-circle distance (haversine formula)."""
    lat_a, lat_b = math.radians(a.lat), math.radians(b.lat)
    half_chord = (
        math.sin((lat_b - lat_a) / 2) ** 2
        + math.cos(lat_a) * math.cos(lat_b) * math.sin(math.radians(b.lon - a.lon) / 2) ** 2
    )
    return 2 * EARTH_RADIUS_MI * math.asin(math.sqrt(half_chord))


def point_between(start: Coordinate, end: Coordinate, fraction: float) -> Coordinate:
    """The point `fraction` of the way from start to end. Linear, which is accurate enough over
    the short segments between a route's polyline vertices."""
    return Coordinate(
        lat=start.lat + (end.lat - start.lat) * fraction,
        lon=start.lon + (end.lon - start.lon) * fraction,
    )
