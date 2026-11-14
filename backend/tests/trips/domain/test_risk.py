from dataclasses import replace

import pytest

from trips.domain.risk import Hazard, HazardKind, RiskLevel, assess_checkpoint
from trips.domain.weather import Conditions

LOW, MODERATE, HIGH = RiskLevel.LOW, RiskLevel.MODERATE, RiskLevel.HIGH
SEVERE, NO_TRAVEL, UNKNOWN = RiskLevel.SEVERE, RiskLevel.NO_TRAVEL, RiskLevel.UNKNOWN
LIGHT_LOAD_LB = 10_000
CALM = Conditions(wind_speed_mph=5, rain_in=0, snowfall_in=0)


def level_for(load_lb: float = LIGHT_LOAD_LB, **weather: float | None) -> RiskLevel:
    return assess_checkpoint(replace(CALM, **weather), load_lb).level


@pytest.mark.parametrize(
    ("mph", "expected"),
    [
        (0, LOW),
        (24.9, LOW),
        (25, MODERATE),
        (34.9, MODERATE),
        (35, HIGH),
        (44.9, HIGH),
        (45, SEVERE),
        (54.9, SEVERE),
        (55, NO_TRAVEL),
        (80, NO_TRAVEL),
    ],
    ids=lambda value: str(value),
)
def test_wind_follows_the_owner_s_table(mph: float, expected: RiskLevel) -> None:
    assert level_for(wind_speed_mph=mph) == expected


@pytest.mark.parametrize(
    ("inches_per_hour", "expected"),
    [
        (0, LOW),
        (0.099, LOW),
        (0.10, MODERATE),
        (0.249, MODERATE),
        (0.25, HIGH),
        (0.499, HIGH),
        (0.50, SEVERE),
        (1.00, SEVERE),
        (1.001, NO_TRAVEL),
    ],
    ids=lambda value: str(value),
)
def test_rain_follows_the_owner_s_table(inches_per_hour: float, expected: RiskLevel) -> None:
    assert level_for(rain_in=inches_per_hour) == expected


@pytest.mark.parametrize(
    ("inches_per_hour", "expected"),
    [
        (0, LOW),
        (0.499, LOW),
        (0.5, MODERATE),
        (0.999, MODERATE),
        (1.0, HIGH),
        (1.999, HIGH),
        (2.0, SEVERE),
        (3.0, SEVERE),
        (3.001, NO_TRAVEL),
    ],
    ids=lambda value: str(value),
)
def test_snow_follows_the_owner_s_table(inches_per_hour: float, expected: RiskLevel) -> None:
    assert level_for(snowfall_in=inches_per_hour) == expected


@pytest.mark.parametrize(
    ("mph", "load_lb", "expected"),
    [
        (55, 1, NO_TRAVEL),
        (45, 30_000, SEVERE),
        (45, 30_001, NO_TRAVEL),
        (54.9, 30_001, NO_TRAVEL),
        (35, 40_000, HIGH),
        (35, 40_001, SEVERE),
        (44.9, 40_001, SEVERE),
        (34.9, 80_000, MODERATE),
    ],
    ids=[
        "55-mph-any-load",
        "45-mph-30000-lb",
        "45-mph-over-30000-lb",
        "54.9-mph-over-30000-lb",
        "35-mph-40000-lb",
        "35-mph-over-40000-lb",
        "44.9-mph-over-40000-lb",
        "34.9-mph-heaviest-load",
    ],
)
def test_heavy_loads_make_strong_wind_worse(
    mph: float, load_lb: float, expected: RiskLevel
) -> None:
    assert level_for(load_lb, wind_speed_mph=mph) == expected


def test_calm_weather_is_low_risk_with_nothing_to_report() -> None:
    risk = assess_checkpoint(CALM, LIGHT_LOAD_LB)

    assert (risk.level, risk.hazards) == (LOW, ())


def test_a_checkpoint_is_as_risky_as_its_worst_condition_and_lists_the_worst_first() -> None:
    risk = assess_checkpoint(
        Conditions(wind_speed_mph=30, rain_in=0.3, snowfall_in=0), LIGHT_LOAD_LB
    )

    assert risk.level == HIGH
    assert risk.hazards == (
        Hazard(HazardKind.RAIN, HIGH, "Rain 0.30 in/hr"),
        Hazard(HazardKind.WIND, MODERATE, "Wind 30 mph"),
    )


@pytest.mark.parametrize(
    ("conditions", "load_lb", "reason"),
    [
        (Conditions(48, 0, 0), 35_000, "Wind 48 mph with a load over 30,000 lb"),
        (Conditions(36, 0, 0), 45_000, "Wind 36 mph with a load over 40,000 lb"),
        (Conditions(44.6, 0, 0), LIGHT_LOAD_LB, "Wind 44.6 mph"),
        (Conditions(5, 0.249, 0), LIGHT_LOAD_LB, "Rain 0.249 in/hr"),
        (Conditions(5, 0, 1.2), LIGHT_LOAD_LB, "Snow 1.20 in/hr"),
    ],
    ids=["load-over-30000", "load-over-40000", "tenths-of-mph", "thousandths-of-inch", "snow"],
)
def test_explains_each_hazard_with_the_numbers_behind_its_level(
    conditions: Conditions, load_lb: float, reason: str
) -> None:
    assert assess_checkpoint(conditions, load_lb).hazards[0].reason == reason


def test_without_any_forecast_the_risk_is_unknown() -> None:
    risk = assess_checkpoint(Conditions(None, None, None), LIGHT_LOAD_LB)

    assert risk.level == UNKNOWN
    assert [hazard.reason for hazard in risk.hazards] == [
        "No wind forecast",
        "No rain forecast",
        "No snow forecast",
    ]


@pytest.mark.parametrize(
    ("known", "expected"),
    [
        ({"rain_in": 0.0}, UNKNOWN),
        ({"rain_in": 0.12}, UNKNOWN),
        ({"rain_in": 0.3}, HIGH),
        ({"rain_in": 0.6}, SEVERE),
    ],
    ids=["calm-rest", "moderate-rest", "high-rest", "severe-rest"],
)
def test_a_missing_reading_never_makes_a_checkpoint_look_safer(
    known: dict[str, float], expected: RiskLevel
) -> None:
    assert level_for(wind_speed_mph=None, **known) == expected
