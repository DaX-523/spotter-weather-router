"""Every adapter turns a failing provider into the same two domain errors."""

from collections.abc import Callable
from datetime import UTC, datetime

import httpx
import pytest

from tests.provider_stubs import StubServer, unreachable_client
from trips.adapters.open_meteo import OpenMeteoWeather
from trips.adapters.tomtom_routing import TomTomRouting
from trips.adapters.tomtom_search import TomTomPlaceSearch
from trips.domain.errors import ProviderResponseError, ProviderUnavailableError
from trips.domain.geo import Coordinate

CHICAGO = Coordinate(lat=41.8781, lon=-87.6298)
DENVER = Coordinate(lat=39.7392, lon=-104.9903)
NOW = datetime(2026, 11, 14, 15, tzinfo=UTC)

CallProvider = Callable[[httpx.Client], object]
CALLS: dict[str, CallProvider] = {
    "routing": lambda client: TomTomRouting(client, api_key="k").routes(CHICAGO, DENVER, NOW, 1),
    "search": lambda client: TomTomPlaceSearch(client, api_key="k").search("Chicago"),
    "weather": lambda client: OpenMeteoWeather(client).hourly([CHICAGO], NOW, NOW),
}
providers = pytest.mark.parametrize("call", CALLS.values(), ids=CALLS.keys())


@providers
@pytest.mark.parametrize(
    "error", [httpx.ReadTimeout, httpx.ConnectError], ids=["timeout", "unreachable"]
)
def test_a_provider_that_does_not_answer_is_unavailable(
    call: CallProvider, error: type[httpx.TransportError]
) -> None:
    with pytest.raises(ProviderUnavailableError, match="is not responding right now"):
        call(unreachable_client(error))


@providers
@pytest.mark.parametrize("status", [429, 500, 503], ids=["rate-limited", "500", "503"])
def test_a_busy_or_failing_provider_is_unavailable(call: CallProvider, status: int) -> None:
    server = StubServer(httpx.Response(status, json={"error": True}))

    with pytest.raises(ProviderUnavailableError, match="is not responding right now"):
        call(server.client())


@providers
@pytest.mark.parametrize(
    "response",
    [
        httpx.Response(400, json={"error": True, "reason": "Bad parameter"}),
        httpx.Response(403, json={"detailedError": {"code": "Forbidden"}}),
        httpx.Response(200, text="<html>Maintenance</html>"),
        httpx.Response(200, json={"unexpected": "shape"}),
    ],
    ids=["bad-request", "forbidden", "not-json", "wrong-shape"],
)
def test_a_response_we_cannot_use_is_a_provider_response_error(
    call: CallProvider, response: httpx.Response
) -> None:
    with pytest.raises(ProviderResponseError, match="sent a response we could not read"):
        call(StubServer(response).client())
