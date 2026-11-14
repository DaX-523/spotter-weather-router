"""Runtime settings. Every environment-dependent value comes from the environment; in development
`make dev-backend` loads it from backend/.env (template: .env.example)."""

import os

from django.core.exceptions import ImproperlyConfigured


def required_env(name: str) -> str:
    value = os.environ.get(name, "")
    if not value:
        raise ImproperlyConfigured(f"Set {name} in the environment or backend/.env")
    return value


def env_list(name: str, default: str) -> list[str]:
    return [item.strip() for item in os.environ.get(name, default).split(",") if item.strip()]


SECRET_KEY = required_env("DJANGO_SECRET_KEY")
DEBUG = os.environ.get("DJANGO_DEBUG", "false").lower() == "true"
ALLOWED_HOSTS = env_list("DJANGO_ALLOWED_HOSTS", "localhost,127.0.0.1")
WSGI_APPLICATION = "config.wsgi.application"

# HTTPS. In production the API sits behind Fly.io's proxy, which ends HTTPS and says so in
# X-Forwarded-Proto. Outside development, plain HTTP is redirected and browsers told to stay on
# HTTPS. `manage.py check --deploy` (in `make check`) holds these to Django's deployment list.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_SSL_REDIRECT = not DEBUG
ONE_YEAR_S = 365 * 24 * 60 * 60
SECURE_HSTS_SECONDS = 0 if DEBUG else ONE_YEAR_S
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SILENCED_SYSTEM_CHECKS = [
    # CSRF middleware: no cookies, sessions or logins, so there is nothing for it to protect (and
    # DRF's views are exempt from it anyway).
    "security.W003",
    # HSTS preload: only a domain we own can join the browsers' preload list; the API is on fly.dev.
    "security.W021",
]

# Planning a trip is a stateless calculation: no database, no sessions, no users.
DATABASES: dict[str, dict[str, str]] = {}
INSTALLED_APPS = ["rest_framework"]
MIDDLEWARE = [
    # A plan carries route lines and 49 hours of corridor risk; it compresses about tenfold.
    "django.middleware.gzip.GZipMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
    "django.middleware.clickjacking.XFrameOptionsMiddleware",
]
ROOT_URLCONF = "config.urls"

USE_TZ = True
TIME_ZONE = "UTC"

REST_FRAMEWORK = {
    "DEFAULT_AUTHENTICATION_CLASSES": [],
    "DEFAULT_PERMISSION_CLASSES": ["rest_framework.permissions.AllowAny"],
    "UNAUTHENTICATED_USER": None,
    "DEFAULT_RENDERER_CLASSES": ["rest_framework.renderers.JSONRenderer"],
    "DEFAULT_PARSER_CLASSES": ["rest_framework.parsers.JSONParser"],
    "EXCEPTION_HANDLER": "config.exception_handler.handle_exception",
    # Per-client limits, so no one client can use up the TomTom key's daily quota (owner's
    # numbers, artifacts/INFRA.md). Each view names its scope. A client is told apart by the
    # address chain the proxies forward (Vercel, then Fly.io). Counts live in the cache below,
    # which is why production runs one process.
    "DEFAULT_THROTTLE_CLASSES": ["rest_framework.throttling.ScopedRateThrottle"],
    "DEFAULT_THROTTLE_RATES": {"trip_plans": "20/hour", "places": "60/min"},
}

# Forecasts (trips/adapters/cached_weather.py) and rate-limit counts, in process memory.
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

# Providers. Open-Meteo needs no key.
TOMTOM_API_KEY = required_env("TOMTOM_API_KEY")
TOMTOM_BASE_URL = os.environ.get("TOMTOM_BASE_URL", "https://api.tomtom.com")
OPEN_METEO_BASE_URL = os.environ.get("OPEN_METEO_BASE_URL", "https://api.open-meteo.com")
# Every outbound call gives up after this long, and the driver is asked to try again.
PROVIDER_TIMEOUT_S = 10
