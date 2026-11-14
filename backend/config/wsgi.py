"""The entry point a production server (gunicorn, see Dockerfile) serves."""

import os

from django.core.wsgi import get_wsgi_application

from trips.wiring import providers

os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

application = get_wsgi_application()

# Build the providers now, so the time-zone data (about a second to load) is ready before the
# first trip is planned rather than during it.
providers()
