from datetime import UTC, datetime, timedelta

from trips.domain.corridor import CORRIDOR_HOURS, corridor_risk
from trips.domain.geo import Coordinate
from trips.domain.risk import Hazard, HazardKind, RiskLevel
from trips.domain.weather import HourlyWeather, PointForecast

START = datetime(2026, 11, 14, 15, tzinfo=UTC)
POINT = Coordinate(lat=41.8781, lon=-87.6298)
LIGHT_LOAD_LB = 10_000


def forecast(hours: int, wind_mph: float = 5) -> PointForecast:
    return PointForecast(
        POINT,
        tuple(
            HourlyWeather(START + timedelta(hours=offset), wind_mph, 0, 0)
            for offset in range(hours)
        ),
    )


def test_rates_every_hour_from_now_to_48_hours_ahead() -> None:
    corridor = corridor_risk({POINT: forecast(49)}, START, LIGHT_LOAD_LB)

    assert corridor.start_at == START
    assert len(corridor.points[0].levels) == CORRIDOR_HOURS + 1 == 49


def test_uses_the_same_rules_as_the_routes_including_the_load() -> None:
    windy = forecast(49, wind_mph=48)

    light = corridor_risk({POINT: windy}, START, 30_000)
    heavy = corridor_risk({POINT: windy}, START, 30_001)

    assert set(light.points[0].levels) == {RiskLevel.SEVERE}
    assert set(heavy.points[0].levels) == {RiskLevel.NO_TRAVEL}


def test_follows_the_weather_hour_by_hour() -> None:
    hours = tuple(
        HourlyWeather(START + timedelta(hours=offset), 30 if offset == 2 else 5, 0, 0)
        for offset in range(49)
    )

    levels = (
        corridor_risk({POINT: PointForecast(POINT, hours)}, START, LIGHT_LOAD_LB).points[0].levels
    )

    assert levels[:4] == (RiskLevel.LOW, RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.LOW)


def test_hours_past_the_forecast_are_unknown() -> None:
    levels = corridor_risk({POINT: forecast(10)}, START, LIGHT_LOAD_LB).points[0].levels

    assert levels[9] == RiskLevel.LOW
    assert set(levels[10:]) == {RiskLevel.UNKNOWN}


def test_keeps_one_entry_per_point() -> None:
    other = Coordinate(lat=39.7392, lon=-104.9903)

    corridor = corridor_risk({POINT: forecast(49), other: forecast(49)}, START, LIGHT_LOAD_LB)

    assert [point.coordinate for point in corridor.points] == [POINT, other]


def test_says_what_makes_each_hour_risky() -> None:
    hours = tuple(
        HourlyWeather(START + timedelta(hours=offset), 38 if offset == 2 else 5, 0, 0)
        for offset in range(49)
    )

    hazards = (
        corridor_risk({POINT: PointForecast(POINT, hours)}, START, LIGHT_LOAD_LB).points[0].hazards
    )

    assert hazards[:3] == ((), (), (Hazard(HazardKind.WIND, RiskLevel.HIGH, "Wind 38 mph"),))
    assert len(hazards) == 49
