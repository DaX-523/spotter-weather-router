"""The real lookup: offline zone data shipped with the package, so no network and no randomness."""

import pytest

from trips.adapters.timezone_lookup import TimezoneFinderLookup
from trips.domain.geo import Coordinate
from trips.ports import TimeZoneLookup

LOOKUP: TimeZoneLookup = TimezoneFinderLookup()


@pytest.mark.parametrize(
    ("point", "zone"),
    [
        (Coordinate(lat=41.8781, lon=-87.6298), "America/Chicago"),
        (Coordinate(lat=39.7392, lon=-104.9903), "America/Denver"),
        (Coordinate(lat=33.4484, lon=-112.0740), "America/Phoenix"),
        (Coordinate(lat=39.7684, lon=-86.1581), "America/Indiana/Indianapolis"),
        (Coordinate(lat=34.0522, lon=-118.2437), "America/Los_Angeles"),
        (Coordinate(lat=40.7128, lon=-74.0060), "America/New_York"),
    ],
    ids=["chicago", "denver", "phoenix-no-dst", "indianapolis", "los-angeles", "new-york"],
)
def test_finds_the_us_time_zone_of_a_point(point: Coordinate, zone: str) -> None:
    assert LOOKUP.zone_at(point) == zone
