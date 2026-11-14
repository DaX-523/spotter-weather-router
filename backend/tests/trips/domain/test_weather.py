from datetime import UTC, datetime, timedelta

from trips.domain.geo import Coordinate
from trips.domain.weather import Conditions, HourlyWeather, PointForecast, conditions_at

NOON = datetime(2026, 11, 14, 12, tzinfo=UTC)
ONE_PM = NOON + timedelta(hours=1)
TWO_PM = NOON + timedelta(hours=2)
FORECAST = PointForecast(
    coordinate=Coordinate(lat=41.8781, lon=-87.6298),
    hours=(
        HourlyWeather(time=NOON, wind_speed_mph=10, rain_in=0.1, snowfall_in=0.0),
        HourlyWeather(time=ONE_PM, wind_speed_mph=20, rain_in=0.2, snowfall_in=0.5),
        HourlyWeather(time=TWO_PM, wind_speed_mph=30, rain_in=0.3, snowfall_in=1.0),
    ),
)


def test_wind_is_read_at_the_nearest_hour_and_rain_and_snow_for_the_hour_the_truck_is_in() -> None:
    conditions = conditions_at(FORECAST, NOON + timedelta(minutes=20))

    assert conditions == Conditions(wind_speed_mph=10, rain_in=0.2, snowfall_in=0.5)


def test_arriving_on_the_hour_reads_the_hour_that_just_ended() -> None:
    conditions = conditions_at(FORECAST, ONE_PM)

    assert conditions == Conditions(wind_speed_mph=20, rain_in=0.2, snowfall_in=0.5)


def test_totals_past_the_end_of_the_forecast_are_unknown() -> None:
    # Wind from 2 PM, the last hour; the 2 to 3 PM totals are past the forecast.
    conditions = conditions_at(FORECAST, TWO_PM + timedelta(minutes=20))

    assert conditions == Conditions(wind_speed_mph=30, rain_in=None, snowfall_in=None)


def test_a_moment_outside_the_forecast_is_unknown() -> None:
    conditions = conditions_at(FORECAST, NOON + timedelta(hours=5))

    assert conditions == Conditions(wind_speed_mph=None, rain_in=None, snowfall_in=None)
