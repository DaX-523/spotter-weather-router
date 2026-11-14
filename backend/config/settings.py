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

# Planning a trip is a stateless calculation: no database, no sessions, no users.
DATABASES: dict[str, dict[str, str]] = {}
INSTALLED_APPS = ["rest_framework"]
MIDDLEWARE = [
    # A plan carries route lines and 49 hours of corridor risk; it compresses about tenfold.
    "django.middleware.gzip.GZipMiddleware",
    "django.middleware.security.SecurityMiddleware",
    "django.middleware.common.CommonMiddleware",
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
}

# Forecasts are cached in process memory (see trips/adapters/cached_weather.py).
CACHES = {"default": {"BACKEND": "django.core.cache.backends.locmem.LocMemCache"}}

# Providers. Open-Meteo needs no key.
TOMTOM_API_KEY = required_env("TOMTOM_API_KEY")
TOMTOM_BASE_URL = os.environ.get("TOMTOM_BASE_URL", "https://api.tomtom.com")
OPEN_METEO_BASE_URL = os.environ.get("OPEN_METEO_BASE_URL", "https://api.open-meteo.com")
# Every outbound call gives up after this long, and the driver is asked to try again.
PROVIDER_TIMEOUT_S = 10
