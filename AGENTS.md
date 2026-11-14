# Spotter Weather Router — Agent Guide

A web app that helps a truck driver choose the safest route between two places, weighing the
weather along each candidate route, the truck's load weight and the travel time.

Monorepo with a React frontend and a Django backend. This file holds the repo-wide rules;
`frontend/AGENTS.md` and `backend/AGENTS.md` add stack-specific ones — read the one for the area
you are changing. Every `CLAUDE.md` just imports its sibling `AGENTS.md`, so edit `AGENTS.md`.

## Status

So far only these guides and `artifacts/` exist. The first build task scaffolds both apps to match
them: the layouts in the stack guides, the tooling configs (Ruff, mypy, pytest, ESLint, Prettier,
Vitest, both coverage gates), a root `Makefile` with exactly the targets under "Commands", a
`.gitignore` that keeps `.env` files out, and CI that runs `make check`. Scaffolding tools such
as `npm create vite` offer to empty a non-empty directory: never let them delete the `AGENTS.md`
or `CLAUDE.md` files. Rewrite this section once the skeleton is in.

## Layout

| Path         | Contents                                                                                |
| ------------ | --------------------------------------------------------------------------------------- |
| `frontend/`  | Vite 8, React 19, TypeScript, Tailwind CSS 4, shadcn/ui, TanStack Query 5, Vitest 5     |
| `backend/`   | Python 3.13, Django 6.1, Django REST Framework 3.18, PostgreSQL, httpx, uv, pytest      |
| `artifacts/` | Owner-maintained requirements log and diagrams. **Read-only for agents.**               |

## Commands (from repo root)

```sh
make install       # install both apps' dependencies
make dev-backend   # API on http://localhost:8000
make dev-frontend  # web app on http://localhost:5173 (proxies /api to the backend)
make migrate       # apply pending DB migrations
make migration app=trips name="add trips"  # generate a migration from model changes
make test          # all tests, fast feedback
make format        # auto-format and auto-fix lint in both apps
make check         # lint + format + types + migration drift + tests with coverage gate, both apps
```

The frontend needs Node 24 (`nvm use 24`); uv manages Python for the backend. The backend reads
its settings from the environment and `backend/.env` (template: `backend/.env.example`):
`DATABASE_URL`, `DJANGO_SECRET_KEY`, `DJANGO_DEBUG`, `DJANGO_ALLOWED_HOSTS`, and one
`<PROVIDER>_API_KEY` per external provider. Integration tests need a running PostgreSQL;
pytest-django creates and drops its own `test_` database, so tests never touch development data.

CI runs `make check` on every push to `main` and every pull request, against a PostgreSQL
service. Deployment is not decided yet. When it is, the owner records it in `artifacts/` and a
"Deploy" section goes in the README. Production settings live in the host's secret store, never
in these files.

## How the system fits together

```text
Browser ──> React SPA ──> Django /api/v1 ──> routing provider (candidate routes)
                                         ──> weather provider (forecasts along each route)
                                         ──> geocoding provider (place names → coordinates)
```

- **The browser talks only to our backend.** Every third-party call (geocoding, routing,
  weather) goes through Django, so API keys stay on the server and a provider can be swapped
  without touching the frontend. Anything in a `VITE_*` variable ships to every visitor: never
  put a secret there. Map tiles are the one exception (see `frontend/AGENTS.md`).
- **Providers sit behind ports.** The backend defines a small interface (a `Protocol`) for each
  provider. Each vendor gets an adapter that translates its response into our domain types at the
  edge. No vendor's field names, units or JSON shapes travel past its adapter.
- **The backend's domain layer decides route safety**, in pure functions. The frontend displays
  and explains the result. It never recomputes, re-scores or re-ranks routes.

## How we work

- **Design before code.** For a new model, endpoint or scoring rule, propose the shape first
  (fields, contract, edge cases) and explain the trade-offs. When the choice is a product
  decision, wait for the owner's call before building.
- **Never invent product decisions.** Risk thresholds, how load weight changes risk, how travel
  time trades off against safety, display units and provider choice all belong to the owner. If
  a task needs one that `artifacts/REQUIREMENTS.md` doesn't record, ask.
- **Reviews separate the essential from the optional.** List must-fix issues and missed edge
  cases first, then optional improvements, each with what it costs. The owner drops suggestions
  that over-engineer the MVP. Don't propose them again.
- Plan, build in small steps, and run the tests locally after each one.

## Engineering standards

Code is written to a high standard of quality **and** test coverage, on both the frontend and the
backend. These are requirements, not suggestions.

### Tests

- **Meaningful unit tests cover the core functionality.** Every behaviour change ships with its
  tests in the same change: scoring rules, unit conversions, validation, API contracts, provider
  translation, and the UI behaviour drivers rely on. A bug fix starts with a failing test that
  reproduces the bug.
- **Fast.** Unit tests never touch a real network, real database or the real clock, and never
  sleep. The whole suite runs in seconds. Behaviour that only a database can prove (constraints,
  migrations, queries) belongs in the backend's integration tests.
- **Never call a third-party API from a test.** Adapters are tested against recorded responses
  saved in the repo. Everything else is tested with in-memory fakes of the ports.
- **Deterministic.** Same result on every run, in any order, on any machine. Inject or freeze time,
  randomness, generated IDs, locale and timezone. No state shared between tests. A flaky test is a
  bug: fix it, never retry it.
- **Easy to understand.** One behaviour per test, named after that behaviour
  (`test_freezing_rain_outranks_heavy_rain`, `it("shows why the slower route is safer")`).
  Arrange–Act–Assert, separated by blank lines. Hard-code expected values instead of re-computing
  them with the logic under test. No loops or conditionals in a test body; use parametrization
  (`pytest.mark.parametrize`, `it.each`).
- **Edge cases, where they exist.** Boundaries (exactly at, just over and just under every
  threshold), zero and maximum load, empty or missing input, a route with no forecast, a single
  candidate route, ties, coordinates at the limits (±90 latitude, ±180 longitude), invalid
  formats, rounding, provider timeouts and malformed provider responses. Table-drive them.
- **Test behaviour, not implementation.** Go through public interfaces: functions, HTTP endpoints,
  what the user sees. Mock only at system boundaries (HTTP, database, clock), never the unit under
  test.
- **Coverage gate: 90%** of lines, branches and functions per app, enforced by `make check`. It is
  a floor, not the goal. Tests without assertions, written only to raise the number, are not
  acceptable.

### Code structure, readability, maintainability

- Business logic lives in plain, framework-free functions and modules. Django views and React
  components are thin adapters around it. This is what keeps the core unit-testable.
- Dependencies point inward: `api → services → domain`. Adapters implement ports and depend on
  domain types. The domain imports nothing from Django, DRF, the ORM or httpx.
- Small, single-purpose functions and modules. Intention-revealing names, no unexplained
  abbreviations.
- Strict typing everywhere: TypeScript `strict`, mypy `strict` (with the Django and DRF stubs). No
  `any`, `@ts-ignore`, `# type: ignore`, `# noqa` or `eslint-disable` without a comment saying
  why.
- Validate input at the boundary (DRF serializers on the API, form validation in the UI, adapters
  for provider responses), then trust the types inside.
- Handle errors explicitly and never swallow exceptions. Fail with a message that says what went
  wrong. A provider being slow or down is an expected case with its own error type, not a crash.
- Every outbound network call has a timeout.
- No dead code, commented-out code, debug prints or magic numbers; name your constants.
- Prefer clarity over cleverness. Build for today's requirements, and add a module, layer or
  abstraction only when the first real need for it arrives.
- Add a dependency only when it clearly earns its place.

### Domain: safety

- **Missing data is "unknown", never "safe".** A stretch of route without a usable forecast is
  reported as unknown and lowers the confidence of that route's assessment. It must never make a
  route look safer.
- **Weather is evaluated for when the truck will be there**: the departure time plus the
  estimated travel time to each point. It is never the weather at the moment of the request.
- **Scoring is deterministic and explainable.** The same inputs always give the same result, and
  every assessment carries the factors that produced it (what hazard, where, when), so the UI can
  say *why* a route ranks where it does.
- **Every threshold and weight is a named constant**, with a comment on its reasoning or source,
  and has tests at and around its boundary. Examples are wind speed limits, how load weight
  changes a hazard, and how much travel time counts against safety. The values themselves are
  product decisions recorded in `artifacts/REQUIREMENTS.md`, not invented in code.
- **The app advises, it does not guarantee.** Copy calls a route lower or higher risk than the
  alternatives and gives the reasons. It never promises that a route is safe.

### Domain: units, time and coordinates

- **One internal unit system: SI.** Metres, seconds, kilograms, metres per second, degrees
  Celsius, millimetres of precipitation. Provider adapters convert into SI and the UI converts
  for display, so arithmetic only ever happens in SI. Display units are a product decision.
- **Put the unit in the name** wherever the type doesn't carry it: `distance_m`, `duration_s`,
  `gross_weight_kg`, `wind_speed_ms`. The same names are used on the wire.
- **Floats are fine here, but float equality is not.** Compare computed values with an explicit
  tolerance (`pytest.approx`, `toBeCloseTo`), and round for display to a named precision.
- **Time is timezone-aware and stored in UTC** (`USE_TZ = True`). It travels as ISO 8601 with an
  offset and is converted to the driver's zone only for display. Durations are integer seconds.
  Logic gets the current time from an injected clock, never from `datetime.now()` or
  `Date.now()`.
- **Coordinates are always named, never positional.** GeoJSON and many routing APIs order points
  `[lon, lat]`, while Leaflet orders them `[lat, lng]`. Inside our code a point is always a named
  type (`Coordinate(lat=…, lon=…)` in Python, `{ lat, lon }` in TypeScript), never a bare tuple
  or array crossing a module boundary. We say `lon` everywhere. Each conversion to an
  order-dependent format happens in exactly one function, which is tested. Ranges are validated
  at the boundary: latitude in [-90, 90], longitude in [-180, 180].

## The `artifacts/` folder

`artifacts/` holds the owner's append-only decision log (`REQUIREMENTS.md`), sketches and derived
diagrams. Read it for context; do not edit it unless the user explicitly asks.

## Definition of done

1. Tests are added or updated for the change, including the relevant edge cases.
2. `make check` passes.
3. The diff has no unrelated changes and no leftover debug code.
