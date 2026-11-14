"""The API contract: request validation and response shapes for /api/v1."""

from collections.abc import Mapping
from typing import Any

from rest_framework import serializers

from trips.domain.geo import Coordinate
from trips.services.plan_trip import TripRequest

PLACE_QUERY_MIN_LENGTH = 2
PLACE_QUERY_MAX_LENGTH = 100
# The US federal gross weight limit on interstates (owner's decision): no legal load without a
# special permit can exceed it.
MAX_LOAD_WEIGHT_LB = 80_000


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
        if value > MAX_LOAD_WEIGHT_LB:
            raise serializers.ValidationError(
                f"Load weight can be at most {MAX_LOAD_WEIGHT_LB:,} lb, the federal limit."
            )
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


class HazardSerializer(serializers.Serializer[Any]):
    kind = serializers.CharField()
    level = serializers.CharField()
    reason = serializers.CharField()


class CheckpointRiskSerializer(serializers.Serializer[Any]):
    level = serializers.CharField()
    hazards = HazardSerializer(many=True)


class CheckpointSerializer(serializers.Serializer[Any]):
    coordinate = CoordinateSerializer()
    mile_marker_mi = serializers.FloatField()
    eta = serializers.DateTimeField()
    weather = ConditionsSerializer(source="conditions")
    risk = CheckpointRiskSerializer()
    time_zone = serializers.CharField()


class RouteRiskSerializer(serializers.Serializer[Any]):
    level = serializers.CharField()
    no_travel_mi = serializers.FloatField()
    severe_mi = serializers.FloatField()
    high_mi = serializers.FloatField()
    average_score = serializers.FloatField()


class RouteSerializer(serializers.Serializer[Any]):
    id = serializers.IntegerField()
    distance_mi = serializers.FloatField()
    duration_s = serializers.IntegerField()
    arrival_at = serializers.DateTimeField()
    polyline = CoordinateSerializer(many=True)
    checkpoints = CheckpointSerializer(many=True)
    risk = RouteRiskSerializer()


class RecommendationSerializer(serializers.Serializer[Any]):
    route_id = serializers.IntegerField(allow_null=True)
    reason = serializers.CharField()


class CorridorPointSerializer(serializers.Serializer[Any]):
    coordinate = CoordinateSerializer()
    levels = serializers.ListField(child=serializers.CharField())
    # Per hour, what makes it more than Low; mostly empty, so it costs little on the wire.
    hazards = serializers.ListField(child=HazardSerializer(many=True))


class CorridorSerializer(serializers.Serializer[Any]):
    """The heatmap: each point's risk level, and its causes, for every hour from `start_at`, 0 to
    48 h."""

    start_at = serializers.DateTimeField()
    points = CorridorPointSerializer(many=True)


class TripPlanSerializer(serializers.Serializer[Any]):
    departure_at = serializers.DateTimeField()
    spacing_mi = serializers.IntegerField()
    routes = RouteSerializer(many=True)
    recommendation = RecommendationSerializer()
    corridor = CorridorSerializer()
    origin_time_zone = serializers.CharField()
    destination_time_zone = serializers.CharField()


class PlaceQuerySerializer(StrictSerializer):
    query = serializers.CharField(
        min_length=PLACE_QUERY_MIN_LENGTH, max_length=PLACE_QUERY_MAX_LENGTH
    )


class PlaceSerializer(serializers.Serializer[Any]):
    name = serializers.CharField()
    coordinate = CoordinateSerializer()
    time_zone = serializers.CharField()
