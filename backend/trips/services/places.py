"""Origin and destination suggestions, each with its time zone, so the form can take the
departure in the origin's local time."""

from dataclasses import dataclass

from trips.domain.geo import Coordinate
from trips.ports import PlaceSearch, TimeZoneLookup


@dataclass(frozen=True)
class PlaceSuggestion:
    name: str
    coordinate: Coordinate
    time_zone: str


def suggest_places(query: str, search: PlaceSearch, zones: TimeZoneLookup) -> list[PlaceSuggestion]:
    return [
        PlaceSuggestion(place.name, place.coordinate, zones.zone_at(place.coordinate))
        for place in search.search(query)
    ]
