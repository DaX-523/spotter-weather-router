from django.http import HttpRequest, JsonResponse
from django.views.decorators.http import require_GET


@require_GET
def health(_: HttpRequest) -> JsonResponse:
    """Liveness check for local runs and the host's health probe."""
    return JsonResponse({"status": "ok"})
