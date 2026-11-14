"""The one place domain errors become HTTP responses. Everything else gets DRF's default."""

from typing import Any

from rest_framework import status
from rest_framework.response import Response
from rest_framework.views import exception_handler

from trips.domain.errors import (
    DomainError,
    InvalidInputError,
    NotFoundError,
    ProviderResponseError,
    ProviderUnavailableError,
)

STATUS_BY_ERROR: dict[type[DomainError], int] = {
    NotFoundError: status.HTTP_404_NOT_FOUND,
    ProviderResponseError: status.HTTP_502_BAD_GATEWAY,
    ProviderUnavailableError: status.HTTP_503_SERVICE_UNAVAILABLE,
}


def handle_exception(error: Exception, context: dict[str, Any]) -> Response | None:
    if isinstance(error, InvalidInputError):
        # Shaped like DRF's validation errors, so the form shows it next to the field.
        return Response({error.field: [str(error)]}, status=status.HTTP_400_BAD_REQUEST)
    for error_type, status_code in STATUS_BY_ERROR.items():
        if isinstance(error, error_type):
            return Response({"detail": str(error)}, status=status_code)
    return exception_handler(error, context)
