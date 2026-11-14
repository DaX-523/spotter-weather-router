import { ArrowRight, ChevronUp, CircleCheck, Truck } from "lucide-react";
import { useMemo, useState } from "react";

import { RiskBadge } from "@/components/trip-planner/risk-badge";
import { Slider } from "@/components/ui/slider";
import { usePeek } from "@/hooks/use-peek";
import type { Corridor, RiskLevel, Route } from "@/lib/api";
import {
  CORRIDOR_HOURS,
  corridorPeak,
  forecastHourLabel,
  hazardCause,
  hourMoment,
  hourOffsetLabel,
  hourlyWorst,
  levelCounts,
  reasonsAt,
  sliderHour,
} from "@/lib/corridor";
import { RISK_BACKGROUND } from "@/lib/risk";
import { truckPosition, truckSummary } from "@/lib/routes";
import { cn } from "@/lib/utils";

// Labels under the slider, every 12 hours.
const TICK_HOURS = [0, 12, 24, 36, 48];
// The timeline's bar heights: taller is worse, so it reads without colour too. Unknown is as tall
// as High, as the owner's ranking counts it.
const BAR_HEIGHT: Record<RiskLevel, string> = {
  low: "h-1/5",
  moderate: "h-2/5",
  high: "h-3/5",
  unknown: "h-3/5",
  severe: "h-4/5",
  no_travel: "h-full",
};
// Open-Meteo's licence (CC BY 4.0) asks for credit wherever its data is shown.
const WEATHER_SOURCE_URL = "https://open-meteo.com/";
const DETAILS_ID = "forecast-details";
// The details list this many reasons, worst first, and count the rest.
const REASONS_SHOWN = 3;

type Props = {
  corridor: Corridor;
  /** The origin's: the slider's hours are labelled in its local time. */
  timeZone: string;
  hour: number;
  onChange: (hour: number) => void;
  /** The selected route, which the truck follows as the slider moves. */
  route: Route;
  routeName: string;
};

/** The heatmap's hour, from now to 48 hours ahead, and what the map shows at that hour. */
export function ForecastPanel({
  corridor,
  timeZone,
  hour,
  onChange,
  route,
  routeName,
}: Props) {
  const timeline = useMemo(() => hourlyWorst(corridor), [corridor]);
  const peak = corridorPeak(timeline);
  const truck = truckPosition(route, hourMoment(corridor.start_at, hour));
  const reasons = reasonsAt(corridor, hour);
  // Folded, the panel shows the hour, the slider and the outlook; the rest is a tap away. Each
  // new plan peeks it open for a moment, so the driver knows it is there.
  const [detailsOpen, setDetailsOpen] = useState(false);
  const peek = usePeek(corridor);
  const expanded = detailsOpen || peek.peeking;

  return (
    <section
      aria-labelledby="forecast-title"
      className="relative space-y-2.5 rounded-lg border bg-background/95 p-3 text-sm shadow-md backdrop-blur-sm"
    >
      {/* A tab on the top edge, like a sheet's handle: it takes no room inside the panel. */}
      <button
        type="button"
        aria-label="Forecast details"
        aria-expanded={expanded}
        aria-controls={DETAILS_ID}
        title={expanded ? "Hide details" : "Show details"}
        onClick={() => {
          // A click during the peek keeps the details open: the driver caught the nudge.
          peek.stop();
          setDetailsOpen((open) => !open);
        }}
        className="absolute -top-3 left-1/2 flex h-6 w-12 -translate-x-1/2 items-center justify-center rounded-full border bg-background text-muted-foreground shadow-sm after:absolute after:-inset-2 hover:text-foreground"
      >
        <ChevronUp
          aria-hidden="true"
          className={cn(
            "size-4 transition-transform duration-300 motion-reduce:transition-none",
            expanded && "rotate-180",
          )}
        />
      </button>

      <div>
        <header className="flex items-center justify-between gap-2">
          <h2 id="forecast-title" className="font-semibold">
            Weather ahead
          </h2>
          <a
            href={WEATHER_SOURCE_URL}
            target="_blank"
            rel="noreferrer"
            title="Weather data by Open-Meteo.com, fetched when you planned this trip"
            className="inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-xs whitespace-nowrap text-muted-foreground hover:text-foreground"
          >
            <span
              aria-hidden="true"
              className="size-2 rounded-full bg-risk-low motion-safe:animate-pulse"
            />
            Live forecast · Open-Meteo
          </a>
        </header>
        {/* Opens above the slider, so the panel grows upward and the slider stays put. It slides
            open from nothing (a grid row from 0fr to 1fr); folded, it is inert, so nothing
            inside can be focused or read. */}
        <div
          id={DETAILS_ID}
          role="region"
          aria-label="Forecast details"
          inert={!expanded}
          className={cn(
            "grid transition-[grid-template-rows,opacity] duration-300 ease-in-out motion-reduce:transition-none",
            expanded
              ? "grid-rows-[1fr] opacity-100"
              : "grid-rows-[0fr] opacity-0",
          )}
        >
          <div className="min-h-0 overflow-hidden">
            <div className="space-y-2.5 pt-2.5">
              <div className="flex items-start gap-2">
                <Truck
                  aria-hidden="true"
                  className="mt-0.5 size-4 shrink-0 text-map-route"
                />
                <div>
                  <p className="text-xs text-muted-foreground">
                    Your truck · {routeName}
                  </p>
                  <p className="flex flex-wrap items-center gap-x-2">
                    {truckSummary(route, truck)}{" "}
                    {truck.state === "driving" && (
                      <RiskBadge level={truck.checkpoint.risk.level} />
                    )}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-muted-foreground">
                  Checkpoints at this hour, all routes
                </p>
                <ul
                  aria-label="Checkpoints at this hour"
                  className="flex flex-wrap gap-1.5"
                >
                  {levelCounts(corridor, hour).map(({ level, count }) => (
                    <li
                      key={level}
                      className="inline-flex items-center gap-1 rounded-full border px-2 py-0.5"
                    >
                      <RiskBadge level={level} />{" "}
                      <span className="text-xs tabular-nums">{count}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {reasons.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-muted-foreground">
                    Why at this hour
                  </p>
                  <ul
                    aria-label="Why at this hour"
                    className="space-y-0.5 text-xs"
                  >
                    {reasons.slice(0, REASONS_SHOWN).map((reason) => (
                      <li key={reason}>{reason}</li>
                    ))}
                    {reasons.length > REASONS_SHOWN && (
                      <li className="text-muted-foreground">
                        and {reasons.length - REASONS_SHOWN} more
                      </li>
                    )}
                  </ul>
                </div>
              )}

              <details className="text-xs text-muted-foreground">
                <summary className="cursor-pointer py-1 font-medium text-foreground">
                  What am I looking at?
                </summary>
                <ul className="mt-1 list-disc space-y-1 pl-4">
                  <li>
                    The coloured shading is the forecast risk around every
                    checkpoint at the hour you pick, rated with the same weather
                    and load rules as the routes. Only green means no checkpoint
                    is above Low at that hour.
                  </li>
                  <li>
                    A symbol floats above each shaded spot that isn&apos;t
                    green: wind, rain or snow is what makes it risky at that
                    hour. Hover one for the numbers.
                  </li>
                  <li>
                    The blue ring is where your truck will be at that hour on
                    the selected route.
                  </li>
                  <li>
                    Symbols on the route show the weather when your truck gets
                    there, so they stay put as the slider moves.
                  </li>
                  <li>
                    The forecast is live from Open-Meteo, fetched when you
                    planned the trip.
                  </li>
                </ul>
              </details>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="flex items-baseline justify-between gap-2">
          <span
            id="forecast-hour-label"
            className="text-xs text-muted-foreground"
          >
            Forecast hour
          </span>
          <span className="font-medium tabular-nums">
            {forecastHourLabel(corridor.start_at, hour, timeZone)}
          </span>
        </div>
        <Timeline timeline={timeline} hour={hour} />
        <Slider
          aria-labelledby="forecast-hour-label"
          min={0}
          max={CORRIDOR_HOURS}
          step={1}
          value={[hour]}
          onValueChange={(value) => onChange(sliderHour(value))}
          className="py-1.5"
        />
        <div
          aria-hidden="true"
          className="flex justify-between text-[0.7rem] text-muted-foreground"
        >
          {TICK_HOURS.map((tick) => (
            <span key={tick}>{hourOffsetLabel(tick)}</span>
          ))}
        </div>
      </div>

      {peak.level === "low" ? (
        <p className="flex items-start gap-2 text-xs">
          <CircleCheck
            aria-hidden="true"
            className="size-4 shrink-0 text-risk-low"
          />
          Low risk at every checkpoint for the next 48 hours, so the shading
          stays green whatever the hour.
        </p>
      ) : (
        <p className="text-xs">
          Worst in the next 48 h: <RiskBadge level={peak.level} /> (
          {hazardCause(corridor, peak.hour, peak.level)}), first at{" "}
          <PeakHour
            label={forecastHourLabel(corridor.start_at, peak.hour, timeZone)}
            onShow={hour === peak.hour ? null : () => onChange(peak.hour)}
          />
        </p>
      )}
    </section>
  );
}

/** The worst hour, as a link that moves the slider there; plain text once it is there. */
function PeakHour({
  label,
  onShow,
}: {
  label: string;
  onShow: (() => void) | null;
}) {
  if (onShow === null) return <span className="font-medium">{label}</span>;
  return (
    <button
      type="button"
      aria-label={`Show ${label}`}
      title="Move the slider to this hour"
      onClick={onShow}
      className="inline-flex items-center gap-0.5 font-medium text-map-route underline decoration-dotted underline-offset-2 hover:decoration-solid"
    >
      {label}
      <ArrowRight aria-hidden="true" className="size-3" />
    </button>
  );
}

/** The worst level along the corridor, hour by hour, above the slider: where to look. */
function Timeline({
  timeline,
  hour,
}: {
  timeline: readonly RiskLevel[];
  hour: number;
}) {
  return (
    // The line under the slider says the same in words: the worst level ahead and when.
    <div aria-hidden="true" className="flex h-6 items-end gap-px px-1.5">
      {timeline.map((level, index) => (
        <span
          key={index}
          className={cn(
            "flex-1 rounded-t-[1px] transition-opacity",
            RISK_BACKGROUND[level],
            BAR_HEIGHT[level],
            index === hour ? "opacity-100" : "opacity-45",
          )}
        />
      ))}
    </div>
  );
}
