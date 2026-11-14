# hand written doc, used for maintaining append only key decisions, made in order.

**Initial brief**

React + Django web app that helps a truck driver choose the safest route based on weather,
load weight, and travel time.

i would use the TDD approach for this, write failing tests first, red-green-refactor.

for a clean and maintainable code, i like to use human assisted ai coding approach, where i guide the ai in doing what i want to achieve by setting some clear goals and rules

# this route finder app would be in context of US, do it for units which are US units, metric units for countries like UK is a not now.
so miles, inches, fahrenheit etc

# core Requirements
The user provides some input:
• Origin & destination
• Departure date/time
• Load weight

notes:
- no rest stoppages, that is a not now.
- checkpoints would be after some miles, i would calculate based on the distance between origin and destination, we shall see later in test cases.

The app should:
• Generate 3 route options using a routing API.
• Sample weather every 10 / 25 / 50 miles, using the truck's estimated arrival time at each checkpoint.
• Calculate weather risk using the provided risk/load rules. (to be decided later)
• Recommend the best route, balancing weather risk and travel time.
• Show all routes, checkpoints, risk levels, ETAs, and route summaries on a map. (i will use symbols for risks like google maps does)
• Show a weather heatmap along the trip corridor with a 0–48 hour forecast slider.

- not going to get through the overhead of buidling a routing engine and adding algorithms of graphs, lets use apis externally

key decisions:
- not adding db and keeping it stateless, introducing auth and state so user may login and check their past history is a not now, but the app is to be flexible to adapt later.
-  One response, one weather call.
- assumption: a checkpoint's ETA = departure + route duration × the share of the route's distance covered so far. This assumes a constant average speed.

risk rules (pinned):
- wind mph: low <25, moderate 25–34, high 35–44, severe 45–54, no travel ≥55
- rain in/hr: low <0.10, moderate 0.10–0.25, high 0.25–0.50, severe 0.50–1.00, no travel >1.00
- snow in/hr: low <0.5, moderate 0.5–1.0, high 1.0–2.0, severe 2.0–3.0, no travel >3.0
- edges follow the table's signs; shared inner edges go to the higher level
load rules:
- ≥55 mph → no travel for any load; 45–54 mph + >30,000 lb → no travel; 35–44 mph + >40,000 lb → severe
- load weight is the cargo only
recommendation: never no travel, then fewest severe miles, fewest high miles, lowest average risk, shortest time
- a stretch takes the worse risk of its two checkpoints; unknown counts as high
checkpoint spacing (straight-line distance): <150 mi → 10, 150–600 → 25, >600 → 50
departure: now to 48 h ahead