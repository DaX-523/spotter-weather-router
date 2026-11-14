from collections.abc import Callable
from datetime import UTC, datetime, timedelta, timezone

import pytest

from trips.domain.timing import end_of_hour, eta_at, nearest_hour

DEPARTURE = datetime(2026, 11, 14, 8, 0, tzinfo=UTC)
UTC_MINUS_4 = timezone(timedelta(hours=-4))


@pytest.mark.parametrize(
    ("mile_marker_mi", "expected_eta"),
    [
        (0, datetime(2026, 11, 14, 8, 0, tzinfo=UTC)),
        (25, datetime(2026, 11, 14, 10, 30, tzinfo=UTC)),
        (100, datetime(2026, 11, 14, 18, 0, tzinfo=UTC)),
    ],
    ids=["origin", "quarter-way", "destination"],
)
def test_eta_assumes_a_constant_average_speed(
    mile_marker_mi: float, expected_eta: datetime
) -> None:
    eta = eta_at(
        DEPARTURE, route_duration_s=36_000, mile_marker_mi=mile_marker_mi, route_distance_mi=100
    )

    assert eta == expected_eta


def test_eta_is_rounded_to_the_second() -> None:
    eta = eta_at(DEPARTURE, route_duration_s=10, mile_marker_mi=1, route_distance_mi=3)

    assert eta == datetime(2026, 11, 14, 8, 0, 3, tzinfo=UTC)


def test_eta_needs_a_departure_with_a_timezone() -> None:
    naive_departure = datetime(2026, 11, 14, 8, 0)  # noqa: DTZ001 -- the case under test

    with pytest.raises(ValueError, match="Departure time must include a timezone"):
        eta_at(naive_departure, route_duration_s=3_600, mile_marker_mi=1, route_distance_mi=10)


@pytest.mark.parametrize("route_distance_mi", [0, -1], ids=["zero", "negative"])
def test_eta_needs_a_positive_route_distance(route_distance_mi: float) -> None:
    with pytest.raises(ValueError, match="Route distance must be positive"):
        eta_at(
            DEPARTURE, route_duration_s=3_600, mile_marker_mi=0, route_distance_mi=route_distance_mi
        )


@pytest.mark.parametrize(
    ("moment", "expected_hour"),
    [
        (datetime(2026, 11, 14, 10, 0, tzinfo=UTC), datetime(2026, 11, 14, 10, tzinfo=UTC)),
        (datetime(2026, 11, 14, 10, 29, 59, tzinfo=UTC), datetime(2026, 11, 14, 10, tzinfo=UTC)),
        (datetime(2026, 11, 14, 10, 30, tzinfo=UTC), datetime(2026, 11, 14, 11, tzinfo=UTC)),
        (datetime(2026, 11, 14, 23, 45, tzinfo=UTC), datetime(2026, 11, 15, 0, tzinfo=UTC)),
        (datetime(2026, 11, 14, 6, 40, tzinfo=UTC_MINUS_4), datetime(2026, 11, 14, 11, tzinfo=UTC)),
    ],
    ids=[
        "on-the-hour",
        "just-before-half-past",
        "half-past-rounds-up",
        "rolls-to-next-day",
        "converted-to-utc",
    ],
)
def test_nearest_hour_is_the_closest_whole_hour_in_utc(
    moment: datetime, expected_hour: datetime
) -> None:
    assert nearest_hour(moment) == expected_hour


@pytest.mark.parametrize(
    ("moment", "expected_hour"),
    [
        (datetime(2026, 11, 14, 10, 0, tzinfo=UTC), datetime(2026, 11, 14, 10, tzinfo=UTC)),
        (datetime(2026, 11, 14, 10, 0, 1, tzinfo=UTC), datetime(2026, 11, 14, 11, tzinfo=UTC)),
        (datetime(2026, 11, 14, 10, 20, tzinfo=UTC), datetime(2026, 11, 14, 11, tzinfo=UTC)),
        (datetime(2026, 11, 14, 10, 59, 59, tzinfo=UTC), datetime(2026, 11, 14, 11, tzinfo=UTC)),
        (datetime(2026, 11, 14, 23, 30, tzinfo=UTC), datetime(2026, 11, 15, 0, tzinfo=UTC)),
        (datetime(2026, 11, 14, 6, 20, tzinfo=UTC_MINUS_4), datetime(2026, 11, 14, 11, tzinfo=UTC)),
    ],
    ids=[
        "on-the-hour-closes-the-hour-before",
        "just-after-the-hour",
        "twenty-past",
        "just-before-the-next-hour",
        "rolls-to-next-day",
        "converted-to-utc",
    ],
)
def test_end_of_hour_is_the_end_of_the_hour_the_moment_falls_in(
    moment: datetime, expected_hour: datetime
) -> None:
    assert end_of_hour(moment) == expected_hour


@pytest.mark.parametrize("to_hour", [nearest_hour, end_of_hour], ids=["nearest", "end-of-hour"])
def test_hour_lookups_need_a_moment_with_a_timezone(
    to_hour: Callable[[datetime], datetime],
) -> None:
    naive_moment = datetime(2026, 11, 14, 10, 0)  # noqa: DTZ001 -- the case under test

    with pytest.raises(ValueError, match="Time must include a timezone"):
        to_hour(naive_moment)
