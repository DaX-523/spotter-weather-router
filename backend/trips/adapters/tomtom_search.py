"""Origin and destination suggestions from TomTom's Fuzzy Search API."""

from typing import Any
from urllib.parse import quote

import httpx

from trips.adapters.http import get, json_body
from trips.domain.errors import ProviderResponseError
from trips.domain.geo import Coordinate
from trips.domain.places import Place

PROVIDER = "The place search service"
RESULT_LIMIT = 5
# The app is for US drivers (artifacts/REQUIREMENTS.md).
COUNTRY = "US"


class TomTomPlaceSearch:
    def __init__(self, client: httpx.Client, api_key: str) -> None:
        self._client = client
        self._api_key = api_key

    def search(self, query: str) -> list[Place]:
        # The query is a path segment, so even "/" must be escaped.
        response = get(
            self._client,
            PROVIDER,
            f"/search/2/search/{quote(query, safe='')}.json",
            {
                "key": self._api_key,
                "typeahead": "true",
                "limit": RESULT_LIMIT,
                "countrySet": COUNTRY,
            },
        )
        body = json_body(response, PROVIDER)
        try:
            return [_place(raw) for raw in body["results"]]
        except (KeyError, TypeError, ValueError) as error:
            raise ProviderResponseError(PROVIDER) from error


def _place(raw: Any) -> Place:
    address = raw["address"]["freeformAddress"]
    poi_name = raw.get("poi", {}).get("name")
    position = raw["position"]
    return Place(
        name=f"{poi_name}, {address}" if poi_name else address,
        coordinate=Coordinate(lat=position["lat"], lon=position["lon"]),
    )
