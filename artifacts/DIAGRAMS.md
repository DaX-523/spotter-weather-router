# Flow diagrams

Mermaid diagrams of how Spotter Weather Router works, from the system down to the rules. GitHub
renders them.

## 1. The system

The browser only talks to our API, so provider keys never leave the server. Time zones are looked
up offline.

```mermaid
flowchart LR
  Driver(["Driver"]) --> UI["React app<br/>form · route cards · map · slider"]
  UI -- "GET /api/v1/places" --> API["Django API /api/v1"]
  UI -- "POST /api/v1/trip-plans" --> API
  UI -. "map tiles" .-> OSM[("OpenStreetMap")]
  API -- "truck routes" --> TomTom[("TomTom<br/>routing + search")]
  API -- "hourly forecasts,<br/>one request" --> OpenMeteo[("Open-Meteo")]
  API -- "point → time zone" --> TZ[["timezonefinder<br/>offline data"]]
  API <-->|"forecasts, 15 min"| Cache[("in-memory cache")]
```

## 2. Backend layers

Business rules live in plain Python. Providers sit behind small interfaces, so tests use fakes and
a vendor can be swapped by writing one adapter.

```mermaid
flowchart TB
  subgraph api["trips/api: HTTP"]
    Views["views"] --- Serializers["serializers<br/>(the contract, strict input)"]
  end
  subgraph services["trips/services: use cases"]
    PlanTrip["plan_trip"]
    Places["suggest_places"]
  end
  subgraph domain["trips/domain: pure rules, no Django"]
    direction LR
    Geo["geo · polyline"] --- Checkpoints["checkpoints · timing"]
    Checkpoints --- Risk["risk"] --- Ranking["ranking"] --- Corridor["corridor"]
  end
  subgraph ports["trips/ports.py: interfaces"]
    RoutingPort["RoutingProvider"]
    SearchPort["PlaceSearch"]
    WeatherPort["WeatherProvider"]
    ZonePort["TimeZoneLookup"]
  end
  subgraph adapters["trips/adapters: vendors"]
    TomTomRouting["tomtom_routing"]
    TomTomSearch["tomtom_search"]
    Cached["cached_weather → open_meteo"]
    Zones["timezone_lookup"]
  end
  Wiring["wiring.py<br/>builds the real adapters"]

  Views --> PlanTrip & Places
  PlanTrip --> domain
  PlanTrip --> RoutingPort & WeatherPort & ZonePort
  Places --> SearchPort & ZonePort
  TomTomRouting -. implements .-> RoutingPort
  TomTomSearch -. implements .-> SearchPort
  Cached -. implements .-> WeatherPort
  Zones -. implements .-> ZonePort
  Wiring --> adapters
  Views --> Wiring
```

## 3. Picking a place

```mermaid
sequenceDiagram
  actor Driver
  participant Field as Place field
  participant API as GET /places
  participant TomTom as TomTom search
  participant TZ as timezonefinder

  Driver->>Field: types "Chic"
  Note over Field: waits for a 250 ms pause<br/>and at least 2 letters
  Field->>API: query=Chic
  API->>TomTom: fuzzy search, US only, 5 results
  TomTom-->>API: names + coordinates
  API->>TZ: time zone of each place
  API-->>Field: name, coordinate, time zone
  Driver->>Field: picks "Chicago, IL"
  Note over Field: departure is now read in Chicago's time (CST)
```

## 4. Planning a trip

One request does the whole job, with one weather call.

```mermaid
sequenceDiagram
  actor Driver
  participant UI as React app
  participant API as POST /trip-plans
  participant Plan as plan_trip
  participant TomTom as TomTom routing
  participant Weather as Weather (cache → Open-Meteo)

  Driver->>UI: origin, destination, departure (origin's local time), load (lb or kg)
  Note over UI: checks the form, converts to UTC and pounds,<br/>puts the trip in the URL
  UI->>API: origin, destination, departure_at (UTC), load_weight_lb
  Note over UI: planning pop-up over the map
  API->>Plan: valid request (load ≤ 80,000 lb)
  Plan->>Plan: departure within now…48 h, origin ≠ destination
  Plan->>TomTom: truck routes with this load and departure
  TomTom-->>Plan: up to 3 routes
  Plan->>Plan: spacing from straight-line distance (10 / 25 / 50 mi)<br/>checkpoints + ETAs on each route
  Plan->>Weather: every distinct checkpoint, now → max(48 h, last ETA)
  Weather-->>Plan: hourly wind, rain + showers, snow
  Plan->>Plan: risk at each ETA → route risk → recommendation<br/>corridor risk for hours 0–48 · time zones
  Plan-->>API: trip plan
  API-->>UI: JSON, gzipped
  UI-->>Driver: recommendation + reason, route cards, map, slider
```

## 5. Rating a checkpoint

```mermaid
flowchart TB
  ETA["Checkpoint ETA"] --> Read["Wind at the nearest hour<br/>Rain + showers and snow for the hour the truck is in"]
  Read --> Each{"Each reading"}
  Each -- "missing" --> Unknown["Unknown<br/>(never Low)"]
  Each -- "wind" --> Wind["Wind scale<br/>25 · 35 · 45 · ≥55 mph"]
  Each -- "rain" --> Rain["Rain scale<br/>0.10 · 0.25 · 0.50 · >1.00 in/hr"]
  Each -- "snow" --> Snow["Snow scale<br/>0.5 · 1.0 · 2.0 · >3.0 in/hr"]
  Wind --> Load{"Load rules"}
  Load -- "Severe wind and load > 30,000 lb" --> NT["No Travel"]
  Load -- "High wind and load > 40,000 lb" --> SV["Severe"]
  Load -- "otherwise" --> Keep["wind level as is"]
  Unknown & NT & SV & Keep & Rain & Snow --> Worst["Worst of the three"]
  Worst --> Rule{"Any reading unknown,<br/>and nothing known is High or worse?"}
  Rule -- "yes" --> LevelU["Checkpoint: Unknown"]
  Rule -- "no" --> LevelW["Checkpoint: the worst level"]
```

## 6. Recommending a route

```mermaid
flowchart TB
  Routes["Rated routes"] --> Miles["Each stretch takes the worse level of its two ends<br/>Unknown miles count as High"]
  Miles --> Drivable{"Any No Travel miles?"}
  Drivable -- "yes" --> Out["Not allowed: never recommended"]
  Drivable -- "no" --> Left{"Any routes left?"}
  Left -- "none" --> NoRec["No recommendation:<br/>'Every route crosses No Travel conditions'"]
  Left -- "yes" --> Sort["Sort by:<br/>1. fewest severe miles<br/>2. fewest high miles<br/>3. lowest average risk<br/>4. shortest travel time"]
  Sort --> Best["Recommend the first,<br/>with the step that decided it"]
```

## 7. Times and time zones

Every time is shown in the local time where it happens.

```mermaid
flowchart LR
  Input["Departure typed in<br/>the origin's local time"] -->|"convert in the browser"| UTC1["departure_at in UTC"]
  UTC1 --> Backend["Backend works in UTC:<br/>ETAs, forecast hours, corridor"]
  Backend --> Zones["Each checkpoint and both ends<br/>get their IANA time zone"]
  Zones --> Show1["Checkpoint ETA:<br/>its own zone"]
  Zones --> Show2["Arrival:<br/>destination's zone"]
  Zones --> Show3["Slider hours:<br/>origin's zone"]
```

## 8. Frontend data flow

```mermaid
flowchart TB
  URL["URL search params<br/>from · to · depart · load"] <--> Hook["useTripQuery"]
  Form["Trip form"] -- "valid trip" --> Hook
  Hook --> Request["tripRequestFrom"]
  Request --> Query["useTripPlan<br/>(TanStack Query, keeps the last plan while loading)"]
  Query --> Status["Status line + recommendation"]
  Query --> Cards["Route cards"]
  Query --> Map["Trip map"]
  Query --> Overlay["Planning pop-up while fetching"]
  Slider["Forecast slider 0–48 h"] -- "useDeferredValue" --> Map
  Cards -- "pick a route" --> Selected["selected route"]
  Map -- "click a line" --> Selected
  Selected --> Map & Cards
```
