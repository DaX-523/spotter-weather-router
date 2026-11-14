"""Truck routes from TomTom's Calculate Route API (v1)."""

import math
from datetime import datetime
from typing import Any

import httpx

from trips.adapters.http import get, json_body
from trips.domain.errors import NoRouteFoundError, ProviderResponseError
from trips.domain.geo import Coordinate
from trips.domain.routes import Route

PROVIDER = "The routing service"
METERS_PER_MILE = 1609.344
KG_PER_LB = 0.45359237
# The fastest route plus two alternatives: the three options the driver compares.
MAX_ALTERNATIVES = 2
# TomTom's way of saying the places can't be joined by a truck route (vs. a bad request).
NO_ROUTE_CODES = frozenset({"NO_ROUTE_FOUND", "MAP_MATCHING_FAILURE"})


class TomTomRouting:
    def __init__(self, client: httpx.Client, api_key: str) -> None:
        self._client = client
        self._api_key = api_key

    def routes(
        self,
        origin: Coordinate,
        destination: Coordinate,
        departure: datetime,
        load_weight_lb: float,
    ) -> list[Route]:
        locations = f"{origin.lat},{origin.lon}:{destination.lat},{destination.lon}"
        response = get(
            self._client,
            PROVIDER,
            f"/routing/1/calculateRoute/{locations}/json",
            {
                "key": self._api_key,
                "travelMode": "truck",
                # Rounded up so the weight restrictions TomTom applies never understate the load.
                "vehicleWeight": math.ceil(load_weight_lb * KG_PER_LB),
                "maxAlternatives": MAX_ALTERNATIVES,
                "departAt": departure.isoformat(timespec="seconds"),
            },
        )
        if (
            response.status_code == httpx.codes.BAD_REQUEST
            and _error_code(response) in NO_ROUTE_CODES
        ):
            raise NoRouteFoundError
        body = json_body(response, PROVIDER)
        try:
            routes = [_route(raw) for raw in body["routes"]]
        except (KeyError, TypeError, ValueError) as error:
            raise ProviderResponseError(PROVIDER) from error
        if not routes:
            raise NoRouteFoundError
        return routes


def _route(raw: Any) -> Route:
    summary = raw["summary"]
    return Route(
        polyline=tuple(
            Coordinate(lat=point["latitude"], lon=point["longitude"])
            for leg in raw["legs"]
            for point in leg["points"]
        ),
        distance_mi=summary["lengthInMeters"] / METERS_PER_MILE,
        duration_s=int(summary["travelTimeInSeconds"]),
    )


def _error_code(response: httpx.Response) -> str | None:
    try:
        code = response.json()["detailedError"]["code"]
    except (ValueError, KeyError, TypeError):
        return None
    return code if isinstance(code, str) else None
