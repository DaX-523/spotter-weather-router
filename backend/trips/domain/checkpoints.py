"""Where along a route the weather is checked."""

from collections.abc import Sequence
from dataclasses import dataclass
from itertools import pairwise

from trips.domain.geo import Coordinate, distance_mi, point_between

# Owner's bands (artifacts/REQUIREMENTS.md), on the straight-line trip distance.
SHORT_TRIP_UNDER_MI = 150
MEDIUM_TRIP_UP_TO_MI = 600
SHORT_TRIP_SPACING_MI = 10
MEDIUM_TRIP_SPACING_MI = 25
LONG_TRIP_SPACING_MI = 50
# An interval checkpoint closer than this to the destination would duplicate it, so it is dropped.
DESTINATION_MERGE_MI = 0.01


@dataclass(frozen=True)
class Checkpoint:
    coordinate: Coordinate
    mile_marker_mi: float


def checkpoint_spacing_mi(trip_distance_mi: float) -> int:
    """Under 150 mi: every 10 mi. From 150 to 600 mi: every 25. Over 600 mi: every 50."""
    if trip_distance_mi < SHORT_TRIP_UNDER_MI:
        return SHORT_TRIP_SPACING_MI
    if trip_distance_mi <= MEDIUM_TRIP_UP_TO_MI:
        return MEDIUM_TRIP_SPACING_MI
    return LONG_TRIP_SPACING_MI


def place_checkpoints(polyline: Sequence[Coordinate], spacing_mi: float) -> list[Checkpoint]:
    """The origin, a checkpoint every `spacing_mi` along the route, and the destination."""
    if len(polyline) < 2:
        raise ValueError("A route needs at least two points")
    if spacing_mi <= 0:
        raise ValueError(f"Checkpoint spacing must be positive, got {spacing_mi}")

    segments = list(pairwise(polyline))
    lengths_mi = [distance_mi(start, end) for start, end in segments]
    last_interval_mi = sum(lengths_mi) - DESTINATION_MERGE_MI

    checkpoints = [Checkpoint(polyline[0], 0)]
    covered_mi = 0.0
    for (start, end), length_mi in zip(segments, lengths_mi, strict=True):
        segment_end_mi = covered_mi + length_mi
        # Multiplying, not adding up, keeps markers exact: 10, 20, 30 instead of 29.999999.
        marker_mi = len(checkpoints) * spacing_mi
        while marker_mi <= segment_end_mi and marker_mi < last_interval_mi:
            fraction = (marker_mi - covered_mi) / length_mi
            checkpoints.append(Checkpoint(point_between(start, end, fraction), marker_mi))
            marker_mi = len(checkpoints) * spacing_mi
        covered_mi = segment_end_mi

    checkpoints.append(Checkpoint(polyline[-1], covered_mi))
    return checkpoints
