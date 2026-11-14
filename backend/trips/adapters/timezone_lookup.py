"""Time zones from timezonefinder: offline zone boundaries shipped with the package, so a lookup
needs no network and takes microseconds. Loading the data takes about a second, so wiring builds
one lookup per process."""

from timezonefinder import TimezoneFinder

from trips.domain.geo import Coordinate

# The package covers oceans too, so this only guards against a point it can't place at all.
FALLBACK_ZONE = "UTC"


class TimezoneFinderLookup:
    def __init__(self) -> None:
        self._finder = TimezoneFinder()

    def zone_at(self, point: Coordinate) -> str:
        return self._finder.timezone_at(lat=point.lat, lng=point.lon) or FALLBACK_ZONE
