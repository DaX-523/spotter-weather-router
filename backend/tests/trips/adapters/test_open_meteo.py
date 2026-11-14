from datetime import UTC, datetime, timedelta, timezone

import httpx
import pytest

from tests.provider_stubs import StubServer, stub_json
from trips.adapters.open_meteo import OpenMeteoWeather
from trips.domain.errors import ProviderResponseError
from trips.domain.geo import Coordinate
from trips.domain.weather import HourlyWeather
from trips.ports import WeatherProvider

CHICAGO = Coordinate(lat=41.8781, lon=-87.6298)
DENVER = Coordinate(lat=39.7392, lon=-104.9903)
THREE_PM = datetime(2026, 11, 14, 15, tzinfo=UTC)
FOUR_PM = datetime(2026, 11, 14, 16, tzinfo=UTC)


def weather_for(server: StubServer) -> WeatherProvider:
    return OpenMeteoWeather(server.client())


def ok(body: object) -> StubServer:
    return StubServer(httpx.Response(200, json=body))


def test_asks_for_every_point_in_one_request_in_us_units() -> None:
    server = ok(stub_json("open_meteo/forecast_two_points.json"))

    weather_for(server).hourly([CHICAGO, DENVER], THREE_PM, FOUR_PM)

    assert len(server.requests) == 1
    request = server.requests[0]
    assert request.url.path == "/v1/forecast"
    assert dict(request.url.params) == {
        "latitude": "41.8781,39.7392",
        "longitude": "-87.6298,-104.9903",
        "hourly": "wind_speed_10m,rain,showers,snowfall",
        "wind_speed_unit": "mph",
        "precipitation_unit": "inch",
        "timeformat": "unixtime",
        "timezone": "GMT",
        "start_hour": "2026-11-14T15:00",
        "end_hour": "2026-11-14T16:00",
    }


def test_asks_for_the_hours_in_utc() -> None:
    server = ok(stub_json("open_meteo/forecast_two_points.json"))
    utc_minus_4 = timezone(timedelta(hours=-4))

    weather_for(server).hourly(
        [CHICAGO, DENVER],
        datetime(2026, 11, 14, 11, tzinfo=utc_minus_4),
        datetime(2026, 11, 14, 12, tzinfo=utc_minus_4),
    )

    params = server.requests[0].url.params
    assert (params["start_hour"], params["end_hour"]) == ("2026-11-14T15:00", "2026-11-14T16:00")


def test_returns_each_point_s_hours_in_the_order_asked() -> None:
    server = ok(stub_json("open_meteo/forecast_two_points.json"))

    forecasts = weather_for(server).hourly([CHICAGO, DENVER], THREE_PM, FOUR_PM)

    assert [forecast.coordinate for forecast in forecasts] == [CHICAGO, DENVER]
    assert forecasts[0].hours[0] == HourlyWeather(
        time=THREE_PM, wind_speed_mph=12.4, rain_in=0.0, snowfall_in=0.0
    )
    assert forecasts[1].hours[1].snowfall_in == 1.1


def test_rain_includes_showers() -> None:
    server = ok(stub_json("open_meteo/forecast_two_points.json"))

    forecasts = weather_for(server).hourly([CHICAGO, DENVER], THREE_PM, FOUR_PM)

    # 0.12 in of rain plus 0.03 in of showers in the hour ending at 4 PM.
    assert forecasts[0].hours[1].rain_in == pytest.approx(0.15)


def test_missing_readings_are_unknown() -> None:
    server = ok(stub_json("open_meteo/forecast_two_points.json"))

    forecasts = weather_for(server).hourly([CHICAGO, DENVER], THREE_PM, FOUR_PM)

    # Denver: showers missing at 3 PM, so rain is unknown; wind missing at 4 PM.
    assert forecasts[1].hours[0].rain_in is None
    assert forecasts[1].hours[1].wind_speed_mph is None


def test_a_single_point_comes_back_as_one_object() -> None:
    server = ok(stub_json("open_meteo/forecast_two_points.json")[0])

    forecasts = weather_for(server).hourly([CHICAGO], THREE_PM, FOUR_PM)

    assert [forecast.coordinate for forecast in forecasts] == [CHICAGO]
    assert len(forecasts[0].hours) == 2


def test_no_points_needs_no_request() -> None:
    server = ok([])

    forecasts = weather_for(server).hourly([], THREE_PM, FOUR_PM)

    assert forecasts == []
    assert server.requests == []


def test_fewer_locations_than_points_is_a_provider_response_error() -> None:
    server = ok(stub_json("open_meteo/forecast_two_points.json")[:1])

    with pytest.raises(ProviderResponseError):
        weather_for(server).hourly([CHICAGO, DENVER], THREE_PM, FOUR_PM)


def test_a_reading_that_is_not_a_number_is_a_provider_response_error() -> None:
    body = stub_json("open_meteo/forecast_two_points.json")
    body[0]["hourly"]["wind_speed_10m"][0] = "12 mph"
    server = ok(body)

    with pytest.raises(ProviderResponseError):
        weather_for(server).hourly([CHICAGO, DENVER], THREE_PM, FOUR_PM)


def test_hours_need_a_timezone() -> None:
    server = ok(stub_json("open_meteo/forecast_two_points.json"))
    naive_start = datetime(2026, 11, 14, 15)  # noqa: DTZ001 -- the case under test

    with pytest.raises(ValueError, match="Start and end must include a timezone"):
        weather_for(server).hourly([CHICAGO], naive_start, FOUR_PM)
