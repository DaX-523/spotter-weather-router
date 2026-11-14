"""HTTP plumbing shared by the provider adapters: transport failures and error statuses become
domain errors, so nothing vendor-specific escapes an adapter. URLs are never logged: they carry
API keys."""

import logging
from collections.abc import Mapping
from typing import Any

import httpx

from trips.domain.errors import ProviderResponseError, ProviderUnavailableError

logger = logging.getLogger(__name__)


def get(
    client: httpx.Client, provider: str, path: str, params: Mapping[str, str | int]
) -> httpx.Response:
    """GET `path`. Raises ProviderUnavailableError when the provider can't serve us right now."""
    try:
        response = client.get(path, params=params)
    except httpx.TransportError as error:
        logger.warning("%s could not be reached: %s", provider, type(error).__name__)
        raise ProviderUnavailableError(provider) from error
    if response.status_code == httpx.codes.TOO_MANY_REQUESTS or response.is_server_error:
        logger.warning("%s answered %s", provider, response.status_code)
        raise ProviderUnavailableError(provider)
    return response


def json_body(response: httpx.Response, provider: str) -> Any:
    """The decoded JSON of a successful response. `Any` because it is vendor JSON: each adapter
    checks its shape while parsing and raises ProviderResponseError on a mismatch."""
    if not response.is_success:
        logger.warning("%s answered %s", provider, response.status_code)
        raise ProviderResponseError(provider)
    try:
        return response.json()
    except ValueError as error:
        logger.warning("%s sent a body that is not JSON", provider)
        raise ProviderResponseError(provider) from error
