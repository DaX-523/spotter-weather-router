# Infrastructure

## 2026-11-14: deployment

- **Frontend → Vercel.** The static Vite build, served from Vercel's CDN. Vercel rewrites
  `/api/*` to the API (`frontend/vercel.json`), so the browser only ever talks to one site, as
  with the Vite proxy in development: no CORS and no API URL in the frontend.
- **API → Fly.io**, the same host as salary_mgmt_incubyte. Region `ord` (Chicago): the middle of
  the US, where the drivers are.
  - Not serverless: the time-zone data takes about a second to load and forecasts are cached in
    memory, so the API wants a process that stays up. A plan takes about 5 s, too close to
    serverless time limits.
  - One machine always running (no cold starts), shared-cpu-1x with 512 MB.
  - gunicorn with one process and four threads, so every request shares one forecast cache and
    one set of rate-limit counts.
- **No database.** Planning is stateless.
- **Rate limits, per client:** 20 trip plans an hour and 60 place searches a minute. They keep one
  client from using up the TomTom key's free daily quota.
- **Deploys:** Vercel on every push to `main` (Git integration). Fly by hand: `fly deploy` from
  `backend/`.
- **Secrets** live in Fly (`fly secrets set`): `DJANGO_SECRET_KEY`, `TOMTOM_API_KEY`. Never in the
  repo.
- **Check after the first deploy:** each client's own address reaches the API through Vercel's
  rewrite. If it doesn't, everyone shares one rate limit.
