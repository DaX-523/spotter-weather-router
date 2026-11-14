import type { RiskLevel } from "@/lib/api";
import { RISK_BACKGROUND, RISK_LEVELS, riskLabel } from "@/lib/risk";
import { cn } from "@/lib/utils";

/** A risk level as a coloured dot and its name: never colour alone. */
export function RiskBadge({ level }: { level: RiskLevel }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs font-medium">
      <span
        aria-hidden="true"
        className={cn("size-2.5 shrink-0 rounded-full", RISK_BACKGROUND[level])}
      />
      {riskLabel(level)}
    </span>
  );
}

export function RiskLegend() {
  return (
    <ul aria-label="Risk levels" className="flex flex-wrap gap-x-3 gap-y-1">
      {RISK_LEVELS.map((level) => (
        <li key={level}>
          <RiskBadge level={level} />
        </li>
      ))}
    </ul>
  );
}
