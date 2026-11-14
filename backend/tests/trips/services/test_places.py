from tests.fakes import CHICAGO, DENVER, FakePlaceSearch, FakeTimeZones
from trips.domain.places import Place
from trips.services.places import PlaceSuggestion, suggest_places


def test_suggests_places_with_their_time_zones() -> None:
    search = FakePlaceSearch(result=[Place("Chicago, IL", CHICAGO), Place("Denver, CO", DENVER)])

    suggestions = suggest_places("Chi", search, FakeTimeZones())

    assert search.queries == ["Chi"]
    assert suggestions == [
        PlaceSuggestion("Chicago, IL", CHICAGO, "America/Chicago"),
        PlaceSuggestion("Denver, CO", DENVER, "America/Denver"),
    ]
