from trips.domain.geo import Coordinate
from trips.domain.polyline import simplify

START = Coordinate(lat=30, lon=-100)
END = Coordinate(lat=31, lon=-100)
TOLERANCE_MI = 0.02
# At 30°N one degree of longitude is 59.84 mi, so these points sit this far off the meridian:
FAR_BEND = Coordinate(lat=30.5, lon=-100.001)  # 0.060 mi
NEAR_BEND = Coordinate(lat=30.5, lon=-100.0002)  # 0.012 mi


def test_a_two_point_line_is_unchanged() -> None:
    assert simplify([START, END], TOLERANCE_MI) == (START, END)


def test_points_on_a_straight_line_are_dropped() -> None:
    line = [START, Coordinate(lat=30.1, lon=-100), Coordinate(lat=30.2, lon=-100), END]

    assert simplify(line, TOLERANCE_MI) == (START, END)


def test_a_point_further_than_the_tolerance_from_the_line_is_kept() -> None:
    assert simplify([START, FAR_BEND, END], TOLERANCE_MI) == (START, FAR_BEND, END)


def test_a_point_within_the_tolerance_of_the_line_is_dropped() -> None:
    assert simplify([START, NEAR_BEND, END], TOLERANCE_MI) == (START, END)


def test_each_side_of_a_kept_point_is_simplified_on_its_own() -> None:
    on_first_half = Coordinate(lat=30.25, lon=-100.0005)
    on_second_half = Coordinate(lat=30.75, lon=-100.0005)
    line = [START, on_first_half, FAR_BEND, on_second_half, END]

    # Both are 0.03 mi off START→END, but sit exactly on the lines through FAR_BEND.
    assert simplify(line, TOLERANCE_MI) == (START, FAR_BEND, END)


def test_a_loop_back_to_the_start_keeps_its_far_point() -> None:
    far_away = Coordinate(lat=30.5, lon=-100)

    assert simplify([START, far_away, START], TOLERANCE_MI) == (START, far_away, START)
