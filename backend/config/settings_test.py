"""Settings for the test suite: explicit values, nothing read from .env, no real provider keys."""

import os

os.environ["DJANGO_SECRET_KEY"] = "test-only-secret-key-never-used-outside-tests"
os.environ["TOMTOM_API_KEY"] = "test-only-key-never-sent"

# The runtime settings are the base; the lines above must run first because they require them.
from config.settings import *  # noqa: F403

# Tests talk to fakes. If one ever reaches a real adapter, it fails here instead of calling out.
TOMTOM_BASE_URL = "https://providers.invalid"
OPEN_METEO_BASE_URL = "https://providers.invalid"
