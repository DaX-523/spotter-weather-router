"""Things that can go wrong while planning a trip. Services and adapters raise them; only the API
layer maps them to HTTP status codes. Every message is written so a driver can read it."""


class DomainError(Exception):
    """Base class: the message is safe to show to drivers."""


class NotFoundError(DomainError):
    pass


class NoRouteFoundError(NotFoundError):
    def __init__(self) -> None:
        super().__init__("No truck route was found between these places")


class ProviderUnavailableError(DomainError):
    """A provider timed out, could not be reached, is overloaded or failed on its side."""

    def __init__(self, provider: str) -> None:
        super().__init__(f"{provider} is not responding right now; try again in a minute")


class ProviderResponseError(DomainError):
    """A provider answered, but not with anything we can use."""

    def __init__(self, provider: str) -> None:
        super().__init__(f"{provider} sent a response we could not read; try again later")
