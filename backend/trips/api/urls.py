from django.urls import path

from trips.api.views import PlacesView, TripPlansView

urlpatterns = [
    path("trip-plans", TripPlansView.as_view(), name="trip-plans"),
    path("places", PlacesView.as_view(), name="places"),
]
