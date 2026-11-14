"""Which route to recommend, in the owner's order (artifacts/REQUIREMENTS.md): never one with No
Travel conditions, then the fewest severe miles, the fewest high-risk miles (unknown counts as
high), the lowest average risk, and the shortest travel time."""

from collections.abc import Sequence
from dataclasses import dataclass
from itertools import pairwise

from trips.domain.risk import SCORE, RiskLevel, combine

# Miles compare to a tenth of a mile and the average to a hundredth, so float noise in the
# geometry never decides between two routes.
MILES_DECIMALS = 1
SCORE_DECIMALS = 2
# Why the recommended route won: the first ranking key on which it beats the runner-up.
DECIDED_BY = (
    "Fewest miles in severe conditions",
    "Fewest miles in high-risk conditions",
    "Lowest average risk",
    "Shortest travel time",
)


@dataclass(frozen=True)
class RouteRisk:
    level: RiskLevel
    no_travel_mi: float
    severe_mi: float
    # Unknown miles are counted here too.
    high_mi: float
    # Distance-weighted, from 0 (all low) to 4 (all no travel).
    average_score: float


@dataclass(frozen=True)
class RouteOption:
    route_id: int
    risk: RouteRisk
    duration_s: int


@dataclass(frozen=True)
class Recommendation:
    # None when every route has No Travel conditions.
    route_id: int | None
    reason: str


def route_risk(checkpoints: Sequence[tuple[float, RiskLevel]]) -> RouteRisk:
    """`checkpoints` are (mile marker, level) pairs in order along the route. Each stretch between
    two checkpoints takes the worse level of its two ends (owner's decision)."""
    miles = dict.fromkeys(RiskLevel, 0.0)
    for (start_mi, start), (end_mi, end) in pairwise(checkpoints):
        miles[max(start, end, key=SCORE.__getitem__)] += end_mi - start_mi
    total_mi = sum(miles.values())
    return RouteRisk(
        level=combine(level for _, level in checkpoints),
        no_travel_mi=miles[RiskLevel.NO_TRAVEL],
        severe_mi=miles[RiskLevel.SEVERE],
        high_mi=miles[RiskLevel.HIGH] + miles[RiskLevel.UNKNOWN],
        average_score=sum(SCORE[level] * mi for level, mi in miles.items()) / total_mi,
    )


def recommend(options: Sequence[RouteOption]) -> Recommendation:
    drivable = [option for option in options if option.risk.no_travel_mi == 0]
    if not drivable:
        return Recommendation(
            None, "Every route crosses No Travel conditions. Try a later departure."
        )
    # A stable sort: routes that tie on every key keep the routing service's order.
    best, *others = sorted(drivable, key=_ranking_key)
    if len(options) == 1:
        return Recommendation(best.route_id, "The only route found")
    if not others:
        return Recommendation(best.route_id, "The only route without No Travel conditions")
    for reason, ours, theirs in zip(
        DECIDED_BY, _ranking_key(best), _ranking_key(others[0]), strict=True
    ):
        if ours != theirs:
            return Recommendation(best.route_id, reason)
    return Recommendation(best.route_id, "As safe and as fast as the other routes")


def _ranking_key(option: RouteOption) -> tuple[float, float, float, int]:
    risk = option.risk
    return (
        round(risk.severe_mi, MILES_DECIMALS),
        round(risk.high_mi, MILES_DECIMALS),
        round(risk.average_score, SCORE_DECIMALS),
        option.duration_s,
    )
