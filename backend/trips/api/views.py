"""Thin HTTP adapters: validate the request, call the service, serialize the result."""

from rest_framework.request import Request
from rest_framework.response import Response
from rest_framework.views import APIView

from trips import wiring
from trips.api.serializers import (
    PlaceQuerySerializer,
    PlaceSerializer,
    TripPlanRequestSerializer,
    TripPlanSerializer,
)
from trips.services.places import suggest_places
from trips.services.plan_trip import plan_trip


class TripPlansView(APIView):
    def post(self, request: Request) -> Response:
        serializer = TripPlanRequestSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        providers = wiring.providers()
        plan = plan_trip(
            serializer.trip_request(),
            routing=providers.routing,
            weather=providers.weather,
            zones=providers.time_zones,
            now=providers.clock(),
        )
        return Response(TripPlanSerializer(plan).data)


class PlacesView(APIView):
    def get(self, request: Request) -> Response:
        serializer = PlaceQuerySerializer(data=request.query_params)
        serializer.is_valid(raise_exception=True)
        providers = wiring.providers()
        places = suggest_places(
            serializer.validated_data["query"], providers.place_search, providers.time_zones
        )
        return Response(PlaceSerializer(places, many=True).data)
