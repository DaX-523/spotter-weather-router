"""How risky the weather at a checkpoint is, by the owner's risk and load rules
(artifacts/REQUIREMENTS.md)."""

from collections.abc import Iterable
from dataclasses import dataclass
from enum import StrEnum

from trips.domain.weather import Conditions


class RiskLevel(StrEnum):
    LOW = "low"
    MODERATE = "moderate"
    HIGH = "high"
    SEVERE = "severe"
    NO_TRAVEL = "no_travel"
    # No usable forecast: never treated as safe.
    UNKNOWN = "unknown"


# How bad each level is, to find the worst and to average along a route. Unknown counts as high
# (owner's decision), never as low.
SCORE: dict[RiskLevel, int] = {
    RiskLevel.LOW: 0,
    RiskLevel.MODERATE: 1,
    RiskLevel.HIGH: 2,
    RiskLevel.UNKNOWN: 2,
    RiskLevel.SEVERE: 3,
    RiskLevel.NO_TRAVEL: 4,
}


class HazardKind(StrEnum):
    WIND = "wind"
    RAIN = "rain"
    SNOW = "snow"


@dataclass(frozen=True)
class Hazard:
    kind: HazardKind
    level: RiskLevel
    reason: str


@dataclass(frozen=True)
class CheckpointRisk:
    level: RiskLevel
    # Worst first. Conditions that are low risk are left out.
    hazards: tuple[Hazard, ...]


@dataclass(frozen=True)
class Scale:
    """Where each level starts on one condition's scale, read straight off the owner's table.
    Every level starts at its number (≥), except No Travel for rain and snow, which starts above
    it (>), as the table's signs say."""

    moderate_from: float
    high_from: float
    severe_from: float
    no_travel_from: float
    no_travel_includes_its_number: bool

    def level(self, value: float) -> RiskLevel:
        if value > self.no_travel_from or (
            self.no_travel_includes_its_number and value == self.no_travel_from
        ):
            return RiskLevel.NO_TRAVEL
        if value >= self.severe_from:
            return RiskLevel.SEVERE
        if value >= self.high_from:
            return RiskLevel.HIGH
        if value >= self.moderate_from:
            return RiskLevel.MODERATE
        return RiskLevel.LOW


# Sustained wind, mph: <25 low, 25-34 moderate, 35-44 high, 45-54 severe, ≥55 no travel.
WIND_MPH = Scale(25, 35, 45, 55, no_travel_includes_its_number=True)
# Rain, in/hr: <0.10 low, 0.10-0.25, 0.25-0.50, 0.50-1.00, >1.00 no travel.
RAIN_IN_PER_HOUR = Scale(0.10, 0.25, 0.50, 1.00, no_travel_includes_its_number=False)
# Snow, in/hr: <0.5 low, 0.5-1.0, 1.0-2.0, 2.0-3.0, >3.0 no travel.
SNOW_IN_PER_HOUR = Scale(0.5, 1.0, 2.0, 3.0, no_travel_includes_its_number=False)

# Load rules: strong wind is worse for a heavy load.
# 45-54 mph (severe) with a load over 30,000 lb → No Travel.
NO_TRAVEL_IN_SEVERE_WIND_OVER_LB = 30_000
# 35-44 mph (high) with a load over 40,000 lb → Severe.
SEVERE_IN_HIGH_WIND_OVER_LB = 40_000


def assess_checkpoint(conditions: Conditions, load_weight_lb: float) -> CheckpointRisk:
    factors = (
        _wind(conditions.wind_speed_mph, load_weight_lb),
        _precipitation(HazardKind.RAIN, conditions.rain_in, RAIN_IN_PER_HOUR),
        _precipitation(HazardKind.SNOW, conditions.snowfall_in, SNOW_IN_PER_HOUR),
    )
    hazards = sorted(
        (factor for factor in factors if factor.level is not RiskLevel.LOW),
        key=lambda hazard: SCORE[hazard.level],
        reverse=True,
    )
    return CheckpointRisk(level=combine(factor.level for factor in factors), hazards=tuple(hazards))


def combine(levels: Iterable[RiskLevel]) -> RiskLevel:
    """The worst of several levels. A known High or worse stands; below that, anything unknown
    makes the whole unknown, because the missing part might be the worst."""
    levels = list(levels)
    known = [level for level in levels if level is not RiskLevel.UNKNOWN]
    worst_known = max(known, key=SCORE.__getitem__, default=RiskLevel.LOW)
    if RiskLevel.UNKNOWN in levels and SCORE[worst_known] < SCORE[RiskLevel.HIGH]:
        return RiskLevel.UNKNOWN
    return worst_known


def _wind(mph: float | None, load_weight_lb: float) -> Hazard:
    if mph is None:
        return Hazard(HazardKind.WIND, RiskLevel.UNKNOWN, "No wind forecast")
    level = WIND_MPH.level(mph)
    reason = f"Wind {_tenths(mph)} mph"
    if level is RiskLevel.SEVERE and load_weight_lb > NO_TRAVEL_IN_SEVERE_WIND_OVER_LB:
        return Hazard(
            HazardKind.WIND,
            RiskLevel.NO_TRAVEL,
            f"{reason} with a load over {NO_TRAVEL_IN_SEVERE_WIND_OVER_LB:,} lb",
        )
    if level is RiskLevel.HIGH and load_weight_lb > SEVERE_IN_HIGH_WIND_OVER_LB:
        return Hazard(
            HazardKind.WIND,
            RiskLevel.SEVERE,
            f"{reason} with a load over {SEVERE_IN_HIGH_WIND_OVER_LB:,} lb",
        )
    return Hazard(HazardKind.WIND, level, reason)


def _precipitation(kind: HazardKind, inches: float | None, scale: Scale) -> Hazard:
    name = kind.value
    if inches is None:
        return Hazard(kind, RiskLevel.UNKNOWN, f"No {name} forecast")
    return Hazard(kind, scale.level(inches), f"{name.capitalize()} {_inches(inches)} in/hr")


def _tenths(value: float) -> str:
    """As precise as the forecast (tenths), so 44.6 mph never shows as a severe-looking 45."""
    return f"{value:.1f}".removesuffix(".0")


def _inches(value: float) -> str:
    """Hundredths, or thousandths when they matter: 0.30, 0.249, 1.20."""
    text = f"{value:.3f}"
    return text.removesuffix("0") if text.endswith("0") else text
