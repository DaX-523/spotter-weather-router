# Backend — Agent Guide

Repo-wide standards live in `../AGENTS.md`. This file adds the backend specifics.

## Stack

Python 3.13 · Django 6.1 · Django REST Framework 3.18 · httpx (outbound HTTP) · uv (dependencies
+ venv) · pytest + pytest-django + pytest-cov · Ruff (lint + format) · mypy (strict, with
`django-stubs` and `djangorestframework-stubs`). No database yet (see `../AGENTS.md`).

## Commands (run in `backend/`)

```sh
uv sync                                              # install dependencies
uv run python manage.py runserver                    # http://localhost:8000
uv run pytest                                        # tests
uv run pytest --cov                                  # tests + 90% coverage gate
uv run ruff check --fix . && uv run ruff format .
uv run mypy
```

Full gate: `make check-backend` from the repo root. It also runs `manage.py check`. Add packages
with `uv add <pkg>` (`uv add --dev <pkg>` for tooling); never use pip or hand-edit `uv.lock`.

## Configuration

- `config/settings.py` is the one runtime settings module. It reads every value that depends on
  the environment from environment variables, and from `backend/.env` in development (template:
  `.env.example`). When a required value is missing, startup stops with a message that names the
  variable. `DEBUG` defaults to off.
- Secrets (`DJANGO_SECRET_KEY`, `TOMTOM_API_KEY`) are never hard-coded, committed or logged.
- `config/settings_test.py` imports the runtime settings and overrides what tests need: no
  `.env`, no real provider keys, a local-memory cache and a fast password hasher. pytest uses it
  through `DJANGO_SETTINGS_MODULE`, so a test can never reach a real provider or real data.
- Only `wiring.py` and the adapters read `django.conf.settings`. The domain and services receive
  what they need as arguments.

## Structure

```text
manage.py
config/            the Django project: wiring only
  settings.py      runtime settings, read from the environment
  settings_test.py test overrides
  urls.py          mounts every feature's api/urls.py under /api/v1
  exception_handler.py   the one place domain errors become HTTP responses
  asgi.py, wsgi.py
<feature>/         one Django app per feature area, named after the domain (for example `trips`)
  domain/          pure Python: value objects (frozen dataclasses), rules, scoring, domain errors.
                   No Django, DRF, ORM or httpx imports.
  services/        use cases: take ports and typed inputs, call the domain, return typed results.
                   No DRF, no request objects, no querysets.
  ports.py         Protocols for the outside world: providers (routing, weather, geocoding),
                   repositories, the clock
  adapters/        port implementations: one module per vendor (httpx), ORM repositories
  api/             serializers.py (the API contract), views.py (thin), urls.py
  wiring.py        builds services with real adapters from settings; the only place that does
  models.py, migrations/, admin.py   only once the feature persists something
tests/             mirrors the apps: trips/services/plan_trip.py ↔ tests/trips/services/test_plan_trip.py
  conftest.py      shared fixtures, including the API client with fakes wired in
  fakes.py         in-memory fakes for every port, plus make_* builders for domain objects
  stubs/           hand-written provider responses shaped like the vendor docs, one folder per
                   vendor; provider_stubs.py loads them and builds MockTransport clients
```

Create a directory when the first module needs it. Don't add empty layers, and don't create a
Django app before a feature needs one.

## The API

Everything lives under `/api/v1`.

- Views are explicit DRF `APIView`s. The API mostly computes (plans and assessments) instead of
  doing CRUD, so ViewSets and routers rarely fit. Use one only when a resource really is CRUD.
- Every endpoint has a request serializer that validates input and a response serializer that
  shapes output. Serializers convert to and from domain types. Views never return raw dicts,
  model instances or provider payloads, and services never see a serializer or a request.
- DRF ignores unknown fields by default. Request serializers extend a shared strict base that
  rejects them with a 400, so a client can never set a derived field such as a score.
- `config/exception_handler.py` maps domain errors to status codes:
  - `NotFoundError` → 404
  - `ConflictError` → 409
  - `ProviderUnavailableError` → 503
  - `ProviderResponseError` → 502

  Validation errors keep DRF's default 400 shape (`{"field": ["message"]}`). Every other error is
  `{"detail": "message"}`.
- Domain error messages are written so a driver can read them. Provider error bodies, stack
  traces and API keys never reach the client; log them on the server.
- On the wire: SI numbers with unit-suffixed names (`distance_m`), ISO 8601 datetimes in UTC,
  coordinates as `{"lat": …, "lon": …}`.
- There is no authentication yet. If one becomes a requirement, the owner records it in
  `artifacts/REQUIREMENTS.md` first.

## External providers

- Each provider is a port in `ports.py` with one adapter module per vendor in `adapters/`.
  Services depend only on the port, so swapping a vendor or adding a fallback touches one adapter
  and `wiring.py`.
- Adapters use an `httpx.Client` built in `wiring.py` with the base URL, API key and an explicit
  timeout from settings. Every call has a timeout.
- Adapters translate. They parse the vendor response, convert units into SI, map fields to domain
  types and order coordinates as named points. Errors become domain errors:
  - timeouts and connection failures → `ProviderUnavailableError`
  - non-2xx responses and bodies that don't parse → `ProviderResponseError`

  Nothing vendor-specific leaks out of the adapter.
- Sample weather along a route at a fixed spacing (a named constant), not at every polyline
  vertex. Batch points into one request where the vendor allows it.
- Cache responses that can't change within their validity window with Django's cache framework.
  A forecast for a location and hour is one example. Key the cache on rounded inputs and expire
  it explicitly. Respect each vendor's rate limits and terms.

## Data model and migrations (once something is persisted)

Nothing is persisted today. When a requirement adds storage, add PostgreSQL, an `integration/`
test folder marked `@pytest.mark.django_db`, and `makemigrations --check --dry-run` in the gate,
and follow these rules:

- `models.py` is the source of truth for the schema, and every change ships with a migration.
  Generate it with `makemigrations --name <describe_change>`, then read and fix it.
- Never edit a migration that has been applied anywhere; add a new one. Every migration can be
  reversed: `RunPython` steps always have a `reverse_code`.
- Migrations never import app models or app code. Data migrations use `apps.get_model(...)`, and
  values they depend on are frozen into the migration, so old migrations keep working as the
  app changes.
- Enforce invariants in the database too. Fields are NOT NULL unless a requirement says
  otherwise, use `CheckConstraint`s and `UniqueConstraint`s with explicit names, and every
  foreign key sets an explicit `on_delete`.
- ORM code lives in repository adapters, behind repository ports. Services never build querysets.
  Filter and paginate in SQL, and avoid N+1 queries with `select_related` and
  `prefetch_related`.
- Store facts once. Don't add columns that can be derived from other data.

## Writing code

- Views stay thin. They parse with a serializer, get the service from `wiring.py`, call it, and
  serialize the result.
- Services raise domain exceptions, for example `RouteNotFoundError`. Only
  `config/exception_handler.py` turns them into status codes.
- Pass the clock in. Services take `now: datetime` or a `Clock` port. `timezone.now()` is called
  only in `wiring.py`.
- Domain value objects are frozen dataclasses with type hints, validated when they are built.
- Never hard-code secrets, URLs of real providers or connection strings; read them from settings.
- Type hints everywhere: mypy runs in strict mode and Ruff's rules are enforced (including the
  Django rules, `DJ`).

## Writing tests

- Most tests are plain unit tests of the domain and services, using the fakes from
  `tests/fakes.py`, with no HTTP involved.
- Use DRF's `APIClient` through the `api_client` fixture to test the API contract: status codes,
  response bodies, validation errors (400) and error mapping (502, 503). The fixture serves the
  real URLs with fakes wired in.
- Swap collaborators only at the wiring seam (the `api_client` fixture), or by passing fakes into a
  service. Never patch services, domain code or httpx. Prefer simple in-memory fakes to
  `unittest.mock` chains.
- Adapter tests serve the stubs in `tests/stubs/<vendor>/` through `httpx.MockTransport`: no
  network, and every run is identical. Cover success, empty results, timeouts, non-2xx and
  malformed bodies. Base each stub on the vendor's documented response shape, and keep it to the
  fields the adapter reads plus enough context to look real.
- Table-drive edge cases with `@pytest.mark.parametrize(..., ids=[...])`, using ids that name each
  case. Every threshold gets cases at, just under and just over its boundary.
- Fixtures belong in the nearest `conftest.py`. Keep them small and explicit, with no module-level
  mutable state.
- Control time and randomness by passing them in (a `now` parameter, a seeded `Random`), not by
  patching `datetime` or `random`.
- Compare floats with `pytest.approx` and an explicit tolerance.
- pytest runs with `strict = true` and `filterwarnings = ["error"]`: unknown markers, config typos
  and warnings fail the run. Fix the cause instead of silencing the warning.
