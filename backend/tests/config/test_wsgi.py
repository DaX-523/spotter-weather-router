import json
from collections.abc import Callable
from wsgiref.util import setup_testing_defaults

from config.wsgi import application


def test_serves_the_app_to_a_production_server() -> None:
    environ: dict[str, object] = {"PATH_INFO": "/health", "REQUEST_METHOD": "GET"}
    setup_testing_defaults(environ)
    statuses: list[str] = []

    def start_response(
        status: str, headers: list[tuple[str, str]], exc_info: object = None
    ) -> Callable[[bytes], object]:
        statuses.append(status)
        return lambda _: None

    body = b"".join(application(environ, start_response))

    assert statuses == ["200 OK"]
    assert json.loads(body) == {"status": "ok"}
