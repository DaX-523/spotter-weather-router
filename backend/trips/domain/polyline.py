"""Thinning a route line for the map: thousands of vertices on a straight interstate draw slowly and
add nothing a driver can see."""

import math
from collections.abc import Sequence

from trips.domain.geo import EARTH_RADIUS_MI, Coordinate

MI_PER_DEGREE = EARTH_RADIUS_MI * math.pi / 180


def simplify(polyline: Sequence[Coordinate], tolerance_mi: float) -> tuple[Coordinate, ...]:
    """Ramer-Douglas-Peucker: keeps the ends, then keeps the point farthest from the line between
    two kept points while it is more than `tolerance_mi` off it. Iterative, so long routes cannot
    exhaust the recursion limit."""
    if len(polyline) < 3:
        return tuple(polyline)
    keep = [False] * len(polyline)
    keep[0] = keep[-1] = True
    spans = [(0, len(polyline) - 1)]
    while spans:
        first, last = spans.pop()
        offsets = {
            index: _offset_mi(polyline[index], polyline[first], polyline[last])
            for index in range(first + 1, last)
        }
        farthest = max(offsets, key=offsets.__getitem__, default=None)
        if farthest is not None and offsets[farthest] > tolerance_mi:
            keep[farthest] = True
            spans += [(first, farthest), (farthest, last)]
    return tuple(point for point, kept in zip(polyline, keep, strict=True) if kept)


def _offset_mi(point: Coordinate, start: Coordinate, end: Coordinate) -> float:
    """Distance from `point` to the segment start→end, on a flat map centred on `start`. Accurate
    for the short spans between route vertices."""
    x_scale = MI_PER_DEGREE * math.cos(math.radians(start.lat))
    px, py = (point.lon - start.lon) * x_scale, (point.lat - start.lat) * MI_PER_DEGREE
    ex, ey = (end.lon - start.lon) * x_scale, (end.lat - start.lat) * MI_PER_DEGREE
    length_squared = ex * ex + ey * ey
    if length_squared == 0:
        return math.hypot(px, py)
    along = max(0.0, min(1.0, (px * ex + py * ey) / length_squared))
    return math.hypot(px - along * ex, py - along * ey)
