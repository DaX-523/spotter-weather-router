// How risk is named and shown. The backend decides every level; nothing here re-scores.
import type {
  CheckpointRisk,
  HazardKind,
  RiskLevel,
  RouteRisk,
} from "@/lib/api";
import { formatMiles } from "@/lib/format";

export const RISK_LEVELS: readonly RiskLevel[] = [
  "low",
  "moderate",
  "high",
  "severe",
  "no_travel",
  "unknown",
];

const LABELS: Record<RiskLevel, string> = {
  low: "Low",
  moderate: "Moderate",
  high: "High",
  severe: "Severe",
  no_travel: "No Travel",
  unknown: "Unknown",
};

/** Each level's theme colour, as literal class names so Tailwind generates them. */
export const RISK_BACKGROUND: Record<RiskLevel, string> = {
  low: "bg-risk-low",
  moderate: "bg-risk-moderate",
  high: "bg-risk-high",
  severe: "bg-risk-severe",
  no_travel: "bg-risk-no-travel",
  unknown: "bg-risk-unknown",
};

export function riskLabel(level: RiskLevel): string {
  return LABELS[level];
}

/** The map symbol for a checkpoint, or null for a plain low-risk dot. */
export type MarkerSymbol = HazardKind | "no-travel" | "unknown";

export function markerSymbol(risk: CheckpointRisk): MarkerSymbol | null {
  if (risk.level === "low") return null;
  if (risk.level === "no_travel") return "no-travel";
  if (risk.level === "unknown") return "unknown";
  // The hazard that sets the level, not just the first listed (an unknown reading can tie it).
  const deciding = risk.hazards.find((hazard) => hazard.level === risk.level);
  return deciding?.kind ?? "unknown";
}

/** What a checkpoint's marker says when hovered or read aloud. */
export function markerTitle(risk: CheckpointRisk): string {
  if (risk.hazards.length === 0) return `${riskLabel(risk.level)} risk`;
  const reasons = risk.hazards.map((hazard) => hazard.reason).join("; ");
  return `${riskLabel(risk.level)}: ${reasons}`;
}

/** The miles behind a route's ranking, worst first. */
export function riskMiles(risk: RouteRisk): string {
  const parts: [number, string][] = [
    [risk.no_travel_mi, "No Travel"],
    [risk.severe_mi, "severe"],
    [risk.high_mi, "high or unknown"],
  ];
  const counted = parts
    .filter(([miles]) => miles > 0)
    .map(
      ([miles, label]) =>
        `${miles < 1 ? "<1 mi" : formatMiles(miles)} ${label}`,
    );
  return counted.length > 0
    ? counted.join(" · ")
    : "No severe or high-risk miles";
}
