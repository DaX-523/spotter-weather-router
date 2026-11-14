"""gunicorn's settings in production (Dockerfile). gunicorn reads this file from the working
directory on its own."""

bind = "0.0.0.0:8000"
# One process with four threads: every request shares one forecast cache, one set of rate-limit
# counts and one copy of the time-zone data, which loads at boot (config/wsgi.py). Plans mostly
# wait on the providers, so threads are enough. More processes would split the cache and the
# counts.
workers = 1
threads = 4
accesslog = "-"
# Each request's client as the proxies forward it (Vercel, then Fly.io): the address the rate
# limits count by. `fly logs` shows it.
access_log_format = '%({x-forwarded-for}i)s "%(r)s" %(s)s %(b)s %(M)sms'
