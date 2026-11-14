"""The API contract: request validation and response shapes for /api/v1."""

from collections.abc import Mapping
from typing import Any

from rest_framework import serializers

from trips.domain.geo import Coordinate
from trips.services.plan_trip import TripRequest

PLACE_QUERY_MIN_LENGTH = 2
PLACE_QUERY_MAX_LENGTH = 100


class StrictSerializer(serializers.Serializer[Any]):
    """Rejects fields it doesn't declare (DRF ignores them by default), so a client can never slip
    in a value the server derives, such as a risk level."""

    def to_internal_value(self, data: Any) -> Any:
        if isinstance(data, Mapping):
            unknown = sorted(set(data) - set(self.fields))
            if unknown:
                raise serializers.ValidationError(
                    {name: ["This field is not allowed."] for name in unknown}
                )
        return super().to_internal_value(data)


class CoordinateSerializer(StrictSerializer):
    lat = serializers.FloatField(min_value=-90, max_value=90)
    lon = serializers.FloatField(min_value=-180, max_value=180)


class TripPlanRequestSerializer(StrictSerializer):
    origin = CoordinateSerializer()
    destination = CoordinateSerializer()
    departure_at = serializers.DateTimeField()
    load_weight_lb = serializers.FloatField()

    def validate_load_weight_lb(self, value: float) -> float:
        if value <= 0:
            raise serializers.ValidationError("Load weight must be more than 0 lb.")
        return value

    def trip_request(self) -> TripRequest:
        data = self.validated_data
        return TripRequest(
            origin=Coordinate(**data["origin"]),
            destination=Coordinate(**data["destination"]),
            departure=data["departure_at"],
            load_weight_lb=data["load_weight_lb"],
        )


class ConditionsSerializer(serializers.Serializer[Any]):
    """Rain and snow are inches in the hour; null means unknown, never calm."""

    wind_speed_mph = serializers.FloatField(allow_null=True)
    rain_in = serializers.FloatField(allow_null=True)
    snowfall_in = serializers.FloatField(allow_null=True)


class CheckpointSerializer(serializers.Serializer[Any]):
    coordinate = CoordinateSerializer()
    mile_marker_mi = serializers.FloatField()
    eta = serializers.DateTimeField()
    weather = ConditionsSerializer(source="conditions")


class RouteSerializer(serializers.Serializer[Any]):
    id = serializers.IntegerField()
    distance_mi = serializers.FloatField()
    duration_s = serializers.IntegerField()
    arrival_at = serializers.DateTimeField()
    polyline = CoordinateSerializer(many=True)
    checkpoints = CheckpointSerializer(many=True)


class TripPlanSerializer(serializers.Serializer[Any]):
    departure_at = serializers.DateTimeField()
    spacing_mi = serializers.IntegerField()
    routes = RouteSerializer(many=True)


class PlaceQuerySerializer(StrictSerializer):
    query = serializers.CharField(
        min_length=PLACE_QUERY_MIN_LENGTH, max_length=PLACE_QUERY_MAX_LENGTH
    )


class PlaceSerializer(serializers.Serializer[Any]):
    name = serializers.CharField()
    coordinate = CoordinateSerializer()
