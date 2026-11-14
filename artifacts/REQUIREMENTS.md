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