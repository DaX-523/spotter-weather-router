// What the planning pop-up says while a plan loads: the planner's stages, in order. They
// illustrate the wait; they don't track the server's progress.
export const PLANNING_STEPS = [
  "Finding truck routes",
  "Placing weather checkpoints",
  "Checking the forecast for every ETA",
  "Rating the risk on each route",
];

export const STEP_MS = 1_500;
