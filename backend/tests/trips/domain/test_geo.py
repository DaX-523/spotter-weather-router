import math

import pytest

from trips.domain.geo import Coordinate, distance_mi, point_between

CHICAGO = Coordinate(lat=41.8781, lon=-87.6298)
DENVER = Coordinate(lat=39.7392, lon=-104.9903)


@pytest.mark.parametrize(
    ("lat", "lon"),
    [(90, 0), (-90, 0), (0, 180), (0, -180)],
    ids=["north-pole", "south-pole", "antimeridian-east", "antimeridian-west"],
)
def test_coordinate_accepts_the_limits(lat: float, lon: float) -> None:
    coordinate = Coordinate(lat=lat, lon=lon)

    assert (coordinate.lat, coordinate.lon) == (lat, lon)


@pytest.mark.parametrize(
    ("lat", "lon", "message"),
    [
        (90.0001, 0, "Latitude 90.0001 is outside -90..90"),
        (-90.0001, 0, "Latitude -90.0001 is outside -90..90"),
        (0, 180.0001, "Longitude 180.0001 is outside -180..180"),
        (0, -180.0001, "Longitude -180.0001 is outside -180..180"),
        (math.nan, 0, "Latitude nan is outside -90..90"),
        (0, math.nan, "Longitude nan is outside -180..180"),
    ],
    ids=["lat-over", "lat-under", "lon-over", "lon-under", "lat-nan", "lon-nan"],
)
def test_coordinate_rejects_values_outside_the_limits(lat: float, lon: float, message: str) -> None:
    with pytest.raises(ValueError, match=message):
        Coordinate(lat=lat, lon=lon)


def test_distance_between_a_point_and_itself_is_zero() -> None:
    assert distance_mi(CHICAGO, CHICAGO) == 0


def test_one_degree_of_latitude_is_about_69_miles() -> None:
    distance = distance_mi(Coordinate(lat=0, lon=0), Coordinate(lat=1, lon=0))

    assert distance == pytest.approx(69.09, abs=0.01)


def test_chicago_to_denver_is_about_920_miles_in_a_straight_line() -> None:
    assert distance_mi(CHICAGO, DENVER) == pytest.approx(920, abs=2)


def test_distance_is_the_same_in_both_directions() -> None:
    assert distance_mi(CHICAGO, DENVER) == distance_mi(DENVER, CHICAGO)


@pytest.mark.parametrize(
    ("fraction", "expected"),
    [
        (0, Coordinate(lat=40, lon=-100)),
        (0.25, Coordinate(lat=40.5, lon=-99)),
        (1, Coordinate(lat=42, lon=-96)),
    ],
    ids=["start", "quarter", "end"],
)
def test_point_between_moves_along_the_segment(fraction: float, expected: Coordinate) -> None:
    start = Coordinate(lat=40, lon=-100)
    end = Coordinate(lat=42, lon=-96)

    assert point_between(start, end, fraction) == expected
