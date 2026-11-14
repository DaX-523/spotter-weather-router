import { RiskBadge } from "@/components/trip-planner/risk-badge";
import type { Checkpoint } from "@/lib/api";
import {
  formatClock,
  formatMileMarker,
  formatPerHour,
  formatWind,
} from "@/lib/format";

/** What the driver meets at one checkpoint: shown in the map's popup. The origin and
 * destination are titled by name instead of mile marker. */
export function CheckpointDetails({
  checkpoint,
  title,
}: {
  checkpoint: Checkpoint;
  title?: string;
}) {
  const { weather, risk } = checkpoint;
  const rows = [
    ["ETA", formatClock(checkpoint.eta, checkpoint.time_zone)],
    ["Wind", formatWind(weather.wind_speed_mph)],
    ["Rain", formatPerHour(weather.rain_in)],
    ["Snow", formatPerHour(weather.snowfall_in)],
  ];
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <p className="font-medium">
          {title ?? formatMileMarker(checkpoint.mile_marker_mi)}
        </p>
        <RiskBadge level={risk.level} />
      </div>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        {rows.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-muted-foreground">{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
      {risk.hazards.length > 0 && (
        <ul aria-label="Hazards" className="list-disc pl-4 text-sm">
          {risk.hazards.map((hazard) => (
            <li key={hazard.kind}>{hazard.reason}</li>
          ))}
        </ul>
      )}
    </div>
  );
}
