import pytest

from trips.domain.checkpoints import Checkpoint, checkpoint_spacing_mi, place_checkpoints
from trips.domain.geo import Coordinate, distance_mi

# Along a meridian, latitude grows linearly with distance: 1 degree = 69.0941 mi.
START = Coordinate(lat=30, lon=-100)
ONE_DEGREE_NORTH = Coordinate(lat=31, lon=-100)
ONE_DEGREE_MI = 69.0941


def mile_markers(checkpoints: list[Checkpoint]) -> list[float]:
    return [checkpoint.mile_marker_mi for checkpoint in checkpoints]


@pytest.mark.parametrize(
    ("trip_distance_mi", "expected_spacing_mi"),
    [
        (0, 10),
        (149.9, 10),
        (150, 25),
        (150.1, 25),
        (599.9, 25),
        (600, 25),
        (600.1, 50),
        (2_800, 50),
    ],
    ids=[
        "zero",
        "just-under-150",
        "150",
        "just-over-150",
        "just-under-600",
        "600",
        "just-over-600",
        "coast-to-coast",
    ],
)
def test_checkpoint_spacing_depends_on_the_trip_distance(
    trip_distance_mi: float, expected_spacing_mi: int
) -> None:
    assert checkpoint_spacing_mi(trip_distance_mi) == expected_spacing_mi


def test_checkpoints_start_at_the_origin_and_end_at_the_destination() -> None:
    checkpoints = place_checkpoints([START, ONE_DEGREE_NORTH], spacing_mi=25)

    assert checkpoints[0] == Checkpoint(coordinate=START, mile_marker_mi=0)
    assert checkpoints[-1].coordinate == ONE_DEGREE_NORTH
    assert checkpoints[-1].mile_marker_mi == pytest.approx(ONE_DEGREE_MI, abs=1e-3)


def test_checkpoints_are_placed_every_spacing_along_the_route() -> None:
    checkpoints = place_checkpoints([START, ONE_DEGREE_NORTH], spacing_mi=25)

    assert mile_markers(checkpoints) == pytest.approx([0, 25, 50, ONE_DEGREE_MI], abs=1e-3)


def test_checkpoints_lie_on_the_route() -> None:
    checkpoints = place_checkpoints([START, ONE_DEGREE_NORTH], spacing_mi=25)

    # 25 mi north of 30°N is 30 + 25 / 69.0941 = 30.3618°N, on the same meridian.
    assert checkpoints[1].coordinate.lat == pytest.approx(30.3618, abs=1e-4)
    assert checkpoints[1].coordinate.lon == -100


def test_checkpoints_cross_polyline_vertices() -> None:
    polyline = [
        START,
        Coordinate(lat=30.2, lon=-100),
        Coordinate(lat=30.5, lon=-100),
        ONE_DEGREE_NORTH,
    ]

    checkpoints = place_checkpoints(polyline, spacing_mi=10)

    assert mile_markers(checkpoints) == pytest.approx(
        [0, 10, 20, 30, 40, 50, 60, ONE_DEGREE_MI], abs=1e-3
    )
    # 30 mi lands on the third segment: 30 + 30 / 69.0941 = 30.4342°N.
    assert checkpoints[3].coordinate.lat == pytest.approx(30.4342, abs=1e-4)


def test_repeated_polyline_points_do_not_change_the_checkpoints() -> None:
    middle = Coordinate(lat=30.5, lon=-100)

    with_repeat = place_checkpoints([START, middle, middle, ONE_DEGREE_NORTH], spacing_mi=25)

    assert with_repeat == place_checkpoints([START, middle, ONE_DEGREE_NORTH], spacing_mi=25)


def test_a_route_exactly_two_spacings_long_ends_on_the_destination_once() -> None:
    total = distance_mi(START, ONE_DEGREE_NORTH)

    checkpoints = place_checkpoints([START, ONE_DEGREE_NORTH], spacing_mi=total / 2)

    assert mile_markers(checkpoints) == pytest.approx([0, total / 2, total])


def test_a_checkpoint_within_0_01_mi_of_the_destination_merges_into_it() -> None:
    total = distance_mi(START, ONE_DEGREE_NORTH)

    # The second interval checkpoint would land 0.002 mi short of the destination.
    checkpoints = place_checkpoints([START, ONE_DEGREE_NORTH], spacing_mi=total / 2 - 0.001)

    assert len(checkpoints) == 3


def test_a_checkpoint_more_than_0_01_mi_from_the_destination_is_kept() -> None:
    total = distance_mi(START, ONE_DEGREE_NORTH)

    # The second interval checkpoint lands 0.04 mi short of the destination.
    checkpoints = place_checkpoints([START, ONE_DEGREE_NORTH], spacing_mi=total / 2 - 0.02)

    assert len(checkpoints) == 4


def test_a_route_needs_at_least_two_points() -> None:
    with pytest.raises(ValueError, match="A route needs at least two points"):
        place_checkpoints([START], spacing_mi=10)


@pytest.mark.parametrize("spacing_mi", [0, -10], ids=["zero", "negative"])
def test_spacing_must_be_positive(spacing_mi: float) -> None:
    with pytest.raises(ValueError, match="Checkpoint spacing must be positive"):
        place_checkpoints([START, ONE_DEGREE_NORTH], spacing_mi=spacing_mi)
