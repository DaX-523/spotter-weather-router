# Demo walkthrough (about 6 minutes)

A script to record from. Each part says what to **show** and what to **say**. Timings are a
guide; most of the time goes to the routing and risk logic and to the map, where most of the
evaluation weight is.

## Before recording

- `backend/.env` has `DJANGO_SECRET_KEY` and `TOMTOM_API_KEY`; run `make dev-backend` and
  `make dev-frontend`, and open http://localhost:5173.
- Open the browser's DevTools on the Network tab, filtered to Fetch/XHR, for part 5.
- **The weather is live.** A few minutes before recording, look for a windy or snowy region (a
  weather site's wind map works) and pick a trip that crosses it, so the map shows more than green.
  Keep a calm trip as a fallback: Chicago, IL → Denver, CO with 30,000 lb.
- Have `backend/trips/domain/risk.py`, `backend/trips/domain/ranking.py` and
  `backend/trips/services/plan_trip.py` open in the editor for part 7.

## 1. The problem (0:00–0:20)

**Say:** A driver wants the safest route, not just the fastest. Weather changes along the way and
over time, and a heavy load changes what's safe in strong wind. This app compares truck routes,
checks the forecast for when the truck will actually be at each point, and recommends one, with
reasons.

## 2. Plan a trip (0:20–1:10)

**Show:**

1. Type "Chic" in **Origin**; pick **Chicago, IL** from the suggestions.
2. Pick **Denver, CO** as the **Destination**.
3. Leave **Departure** at now (it accepts anything up to 48 hours ahead), and enter **30000** as
   the **Load weight (lb)**.
4. Click **Plan trip**. Point at the address bar, then reload the page.

**Say:** Places come from TomTom search, through our backend, so no key reaches the browser. The
trip lives in the URL, so a reload, a shared link or the Back button all bring the plan back. The
form checks the same rules as the API, which stays the authority.

## 3. The recommendation (1:10–2:10)

**Show:** The status line ("**Route 2 is recommended.** Fewest miles in severe conditions."), the
**Recommended** tag, each card's risk badge and miles ("100 mi severe · 40 mi high or unknown"),
and "Not allowed: crosses No Travel conditions" if a route has it.

**Say:** Up to three truck routes come from TomTom. Each one gets checkpoints every 10, 25 or
50 miles, depending on the trip's length. Each checkpoint is rated with the owner's table, and
the load rules can raise wind risk by a level. The ranking is strict and in order:

- never a route with No Travel conditions
- then the fewest severe miles
- then the fewest high-risk miles, where a missing forecast counts as high, never as safe
- then the lowest average risk
- then the shortest time

The line under the recommendation says which of those decided it.

## 4. The map (2:10–3:10)

**Show:**

1. The recommended route drawn on top and the others in grey. A route the driver must not take
   is dashed.
2. Click another route's line or card: it becomes the selected route.
3. Hover a hazard symbol (wind, rain, snow, a no-entry sign for No Travel, "?" for Unknown), then
   click one. The popup has the mile marker, ETA, wind, rain, snow and the reasons.
4. Point at the plain green dots: low risk, no symbol.

**Say:** Each checkpoint's weather is the forecast for its ETA. Wind is taken at the nearest
hour. Rain and snow are hourly totals, taken for the hour the truck is in. Numbers are shown as
precisely as the forecast, so 44.6 mph never shows as 45 and looks severe. Colour is never the
only signal: every level also has a word or a symbol.

## 5. The heatmap (3:10–3:50)

**Show:** Drag the **Forecast hour** slider from **Now** to **+48 h**; then use the arrow keys.
Point at the Network tab: no new requests.

**Say:** The shading is the forecast risk around every checkpoint, hour by hour, rated with the
same rules. All 49 hours came with the plan, in the same single weather request, so the slider
never waits on the network. The colours stay exact: overlapping low-risk shading can't add up and
look riskier, which a typical additive heatmap would do.

## 6. The load matters (3:50–4:20)

**Show:** Change the load to **45000** and plan again. The previous plan stays on screen while
the new one loads. If the trip has wind of 35–54 mph, point at a checkpoint whose level went up,
and at its reason ("Wind 48 mph with a load over 30,000 lb").

**Say:** Over 30,000 lb, 45–54 mph wind is No Travel; over 40,000 lb, 35–44 mph is Severe. If
the weather is calm today, show the rule in `risk.py` instead (next part).

## 7. Under the hood (4:20–5:40)

**Show and say, file by file:**

- `backend/trips/domain/risk.py`: the owner's table is three one-line scales; the load rules are
  two named constants. Plain Python, no Django.
- `backend/trips/domain/ranking.py`: the recommendation order, with each stretch taking the worse
  of its two ends.
- `backend/trips/services/plan_trip.py`: the pipeline from routes to checkpoints, ETAs, one
  weather call, risk, recommendation and corridor. Providers come in through `ports.py`, so the
  vendors could be swapped and tests use fakes.
- Run `make check`: lint, strict types and 416 tests (257 backend, 159 frontend) at 100% coverage.
  Built test-first. Every edge of the risk table has a test, and the provider adapters are tested
  against stubs of the vendors' documented responses, never the network.

## 8. Limits and next steps (5:40–6:00)

**Say:**

- ETAs assume a constant average speed, with no rest stops yet.
- Weather is sampled at checkpoints rather than continuously.
- TomTom checks road weight limits against the cargo weight, not the gross weight.
- The design keeps those easy to change: each is one domain function behind tests.
