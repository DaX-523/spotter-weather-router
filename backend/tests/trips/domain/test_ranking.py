from trips.domain.ranking import Recommendation, RouteOption, RouteRisk, recommend, route_risk
from trips.domain.risk import RiskLevel

LOW, MODERATE, HIGH = RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH
SEVERE, NO_TRAVEL, UNKNOWN = RiskLevel.SEVERE, RiskLevel.NO_TRAVEL, RiskLevel.UNKNOWN
CLEAR = RouteRisk(level=LOW, no_travel_mi=0, severe_mi=0, high_mi=0, average_score=0)


def option(
    route_id: int,
    duration_s: int = 36_000,
    *,
    no_travel_mi: float = 0,
    severe_mi: float = 0,
    high_mi: float = 0,
    average_score: float = 0,
) -> RouteOption:
    risk = RouteRisk(LOW, no_travel_mi, severe_mi, high_mi, average_score)
    return RouteOption(route_id, risk, duration_s)


class TestRouteRisk:
    def test_a_stretch_takes_the_worse_risk_of_its_two_ends(self) -> None:
        risk = route_risk([(0, LOW), (50, SEVERE), (100, LOW)])

        assert risk == RouteRisk(
            level=SEVERE, no_travel_mi=0, severe_mi=100, high_mi=0, average_score=3
        )

    def test_weights_the_average_by_distance(self) -> None:
        risk = route_risk([(0, LOW), (10, MODERATE), (30, HIGH), (40, LOW)])

        # 10 mi moderate (1), 20 mi high (2) and 10 mi high (2): 70 / 40.
        assert risk == RouteRisk(
            level=HIGH, no_travel_mi=0, severe_mi=0, high_mi=30, average_score=1.75
        )

    def test_unknown_miles_count_as_high(self) -> None:
        risk = route_risk([(0, LOW), (10, UNKNOWN), (20, LOW)])

        assert risk == RouteRisk(
            level=UNKNOWN, no_travel_mi=0, severe_mi=0, high_mi=20, average_score=2
        )

    def test_counts_no_travel_miles(self) -> None:
        risk = route_risk([(0, LOW), (25, NO_TRAVEL), (50, LOW)])

        assert (risk.level, risk.no_travel_mi, risk.average_score) == (NO_TRAVEL, 50, 4)

    def test_a_known_high_checkpoint_outranks_an_unknown_one(self) -> None:
        assert route_risk([(0, UNKNOWN), (10, HIGH)]).level == HIGH

    def test_a_clear_route_has_nothing_to_count(self) -> None:
        assert route_risk([(0, LOW), (10, LOW)]) == CLEAR


class TestRecommend:
    def test_fewest_severe_miles_wins_even_when_slower(self) -> None:
        options = [option(0, severe_mi=10), option(1, duration_s=50_000)]

        assert recommend(options) == Recommendation(1, "Fewest miles in severe conditions")

    def test_then_fewest_high_risk_miles(self) -> None:
        options = [option(0, severe_mi=5, high_mi=40), option(1, severe_mi=5, high_mi=20)]

        assert recommend(options) == Recommendation(1, "Fewest miles in high-risk conditions")

    def test_then_lowest_average_risk(self) -> None:
        options = [option(0, average_score=1.2), option(1, average_score=0.4)]

        assert recommend(options) == Recommendation(1, "Lowest average risk")

    def test_then_shortest_travel_time(self) -> None:
        options = [option(0, duration_s=40_000), option(1, duration_s=39_000)]

        assert recommend(options) == Recommendation(1, "Shortest travel time")

    def test_differences_under_a_tenth_of_a_mile_do_not_count(self) -> None:
        options = [option(0, severe_mi=50.04, duration_s=30_000), option(1, severe_mi=50)]

        assert recommend(options) == Recommendation(0, "Shortest travel time")

    def test_identical_routes_keep_the_routing_service_s_order(self) -> None:
        assert recommend([option(0), option(1)]) == Recommendation(
            0, "As safe and as fast as the other routes"
        )

    def test_never_recommends_a_route_with_no_travel_conditions(self) -> None:
        options = [option(0, no_travel_mi=5, duration_s=1), option(1, severe_mi=30)]

        assert recommend(options) == Recommendation(
            1, "The only route without No Travel conditions"
        )

    def test_recommends_nothing_when_every_route_has_no_travel_conditions(self) -> None:
        options = [option(0, no_travel_mi=5), option(1, no_travel_mi=1)]

        assert recommend(options) == Recommendation(
            None, "Every route crosses No Travel conditions. Try a later departure."
        )

    def test_a_single_route_is_recommended_when_it_is_safe_to_drive(self) -> None:
        assert recommend([option(0, severe_mi=20)]) == Recommendation(0, "The only route found")
