import { CloudRain, Snowflake, Truck, Wind } from "lucide-react";
import { useEffect, useState } from "react";

import { PLANNING_STEPS, STEP_MS } from "@/lib/planning";

/** Shown over the map while a plan loads: a truck driving through the weather (still, for
 * drivers who prefer reduced motion), and what the planner is doing. */
export function PlanningOverlay() {
  const [step, setStep] = useState(0);

  useEffect(() => {
    const timer = setInterval(
      () =>
        setStep((current) => Math.min(current + 1, PLANNING_STEPS.length - 1)),
      STEP_MS,
    );
    return () => clearInterval(timer);
  }, []);

  return (
    <div className="absolute inset-0 z-[1002] grid place-items-center bg-background/50 p-4 backdrop-blur-sm">
      <div className="planning-card w-full max-w-72 space-y-3 rounded-xl border bg-card p-5 text-center shadow-xl">
        <div className="planning-scene" aria-hidden="true">
          <CloudRain className="planning-weather" />
          <Snowflake className="planning-weather" />
          <Wind className="planning-weather" />
          <Truck className="planning-truck" />
          <div className="planning-road" />
        </div>
        <p role="status" className="text-sm font-medium">
          {PLANNING_STEPS[step]}…
        </p>
        <p className="text-xs text-muted-foreground">
          Every route is checked against the weather for when your truck gets
          there.
        </p>
      </div>
    </div>
  );
}
