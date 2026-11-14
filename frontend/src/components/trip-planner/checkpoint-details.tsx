import type { Checkpoint } from "@/lib/api";
import {
  formatClock,
  formatMileMarker,
  formatPerHour,
  formatWind,
} from "@/lib/format";

/** What the driver meets at one checkpoint: shown in the map's popup. */
export function CheckpointDetails({ checkpoint }: { checkpoint: Checkpoint }) {
  const { weather } = checkpoint;
  const rows = [
    ["ETA", formatClock(checkpoint.eta)],
    ["Wind", formatWind(weather.wind_speed_mph)],
    ["Rain", formatPerHour(weather.rain_in)],
    ["Snow", formatPerHour(weather.snowfall_in)],
  ];
  return (
    <div className="space-y-1">
      <p className="font-medium">
        {formatMileMarker(checkpoint.mile_marker_mi)}
      </p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-sm">
        {rows.map(([term, value]) => (
          <div key={term} className="contents">
            <dt className="text-muted-foreground">{term}</dt>
            <dd>{value}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
