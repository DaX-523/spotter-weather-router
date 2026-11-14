"""Hand-written vendor responses (tests/stubs/) and HTTP clients that serve them, so adapter tests
never touch the network."""

import json
from dataclasses import dataclass, field
from pathlib import Path
from typing import Any

import httpx

STUBS_DIR = Path(__file__).parent / "stubs"
BASE_URL = "https://provider.test"


def stub_json(name: str) -> Any:
    """Vendor JSON exactly as an adapter receives it, hence `Any`."""
    return json.loads((STUBS_DIR / name).read_text())


@dataclass
class StubServer:
    """Answers every request with one canned response, and remembers the requests it got."""

    response: httpx.Response
    requests: list[httpx.Request] = field(default_factory=list)

    def client(self) -> httpx.Client:
        return httpx.Client(transport=httpx.MockTransport(self._handle), base_url=BASE_URL)

    def _handle(self, request: httpx.Request) -> httpx.Response:
        self.requests.append(request)
        return self.response


def unreachable_client(error: type[httpx.TransportError]) -> httpx.Client:
    """A client whose every request fails the way a dead or slow provider would."""

    def fail(request: httpx.Request) -> httpx.Response:
        raise error("provider unreachable", request=request)

    return httpx.Client(transport=httpx.MockTransport(fail), base_url=BASE_URL)
