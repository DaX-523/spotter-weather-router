"""When the truck reaches a point, and which forecast hour describes that moment.

Hourly forecasts are labelled by the hour. Instant readings (wind) are valid at that moment;
hourly totals (rain, snow) cover the hour that *ends* at the label.
"""

from datetime import UTC, datetime, timedelta

ONE_HOUR = timedelta(hours=1)
HALF_HOUR = timedelta(minutes=30)


def eta_at(
    departure: datetime, route_duration_s: int, mile_marker_mi: float, route_distance_mi: float
) -> datetime:
    """MVP assumption (artifacts/REQUIREMENTS.md): the truck keeps a constant average speed, so it
    reaches a point after the same share of the route's duration as of its distance."""
    if departure.tzinfo is None:
        raise ValueError("Departure time must include a timezone")
    if route_distance_mi <= 0:
        raise ValueError(f"Route distance must be positive, got {route_distance_mi}")
    elapsed_s = round(route_duration_s * mile_marker_mi / route_distance_mi)
    return departure + timedelta(seconds=elapsed_s)


def nearest_hour(moment: datetime) -> datetime:
    """For instant readings such as wind: the whole UTC hour nearest to `moment`; half past
    rounds up."""
    utc_moment, hour = _utc_and_hour_start(moment)
    return hour + ONE_HOUR if utc_moment - hour >= HALF_HOUR else hour


def end_of_hour(moment: datetime) -> datetime:
    """For hourly totals such as rain and snow: the label of the hour the truck is in. A moment
    exactly on the hour closes the hour before it."""
    utc_moment, hour = _utc_and_hour_start(moment)
    return hour if utc_moment == hour else hour + ONE_HOUR


def _utc_and_hour_start(moment: datetime) -> tuple[datetime, datetime]:
    if moment.tzinfo is None:
        raise ValueError("Time must include a timezone")
    utc_moment = moment.astimezone(UTC)
    return utc_moment, utc_moment.replace(minute=0, second=0, microsecond=0)
