import httpx

from tests.provider_stubs import StubServer, stub_json
from trips.adapters.tomtom_search import TomTomPlaceSearch
from trips.domain.geo import Coordinate
from trips.domain.places import Place
from trips.ports import PlaceSearch

API_KEY = "test-key"


def search_for(server: StubServer) -> PlaceSearch:
    return TomTomPlaceSearch(server.client(), api_key=API_KEY)


def ok(body: object) -> StubServer:
    return StubServer(httpx.Response(200, json=body))


def test_searches_us_places_as_the_driver_types() -> None:
    server = ok(stub_json("tomtom/fuzzy_search.json"))

    search_for(server).search("Chicago, IL")

    request = server.requests[0]
    assert request.url.path == "/search/2/search/Chicago, IL.json"
    assert dict(request.url.params) == {
        "key": API_KEY,
        "typeahead": "true",
        "limit": "5",
        "countrySet": "US",
    }


def test_a_slash_in_the_query_stays_inside_the_query() -> None:
    server = ok(stub_json("tomtom/fuzzy_search.json"))

    search_for(server).search("I-80/I-94")

    assert server.requests[0].url.raw_path.startswith(b"/search/2/search/I-80%2FI-94.json")


def test_names_places_by_their_address_and_points_of_interest_by_name_too() -> None:
    server = ok(stub_json("tomtom/fuzzy_search.json"))

    places = search_for(server).search("chicago")

    assert places == [
        Place(name="Chicago, IL", coordinate=Coordinate(lat=41.88425, lon=-87.63245)),
        Place(
            name="Chicago Midway International Airport, 5700 S Cicero Ave, Chicago, IL 60638",
            coordinate=Coordinate(lat=41.78598, lon=-87.75242),
        ),
    ]


def test_no_results_is_an_empty_list() -> None:
    server = ok({"summary": {"query": "zzzz", "numResults": 0}, "results": []})

    assert search_for(server).search("zzzz") == []
