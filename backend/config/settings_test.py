"""Settings for the test suite: explicit values, nothing read from .env, no real provider keys."""

import os

os.environ["DJANGO_SECRET_KEY"] = "test-only-secret-key-never-used-outside-tests"

# The runtime settings are the base; the line above must run first because they require it.
from config.settings import *  # noqa: F403
