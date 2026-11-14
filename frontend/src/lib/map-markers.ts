// Leaflet draws custom markers from HTML strings, so the symbols come from lucide-static: the same
// icons as lucide-react, as plain SVG. Their look is in index.css.
import {
  CircleQuestionMark,
  CloudRain,
  Flag,
  OctagonX,
  Snowflake,
  Truck,
  Wind,
} from "lucide-static";

import type { HazardKind, RiskLevel } from "@/lib/api";
import type { MarkerSymbol } from "@/lib/risk";

const ICONS: Record<MarkerSymbol, string> = {
  wind: Wind,
  rain: CloudRain,
  snow: Snowflake,
  "no-travel": OctagonX,
  unknown: CircleQuestionMark,
};

export type Endpoint = "origin" | "destination";

/** A checkpoint: a plain dot where the risk is low, otherwise its symbol on a disc in the
 * level's colour. `label` names the risk for screen readers ("Severe, wind"); its tooltip, which
 * Leaflet ties to the marker, says the rest. */
export function checkpointMarkerHtml(
  symbol: MarkerSymbol | null,
  level: RiskLevel,
  label: string,
): string {
  const named = `role="img" aria-label="${label}"`;
  if (symbol === null) {
    return `<span class="checkpoint-dot" ${named}></span>`;
  }
  return `<span class="risk-marker" data-level="${level}" ${named}>${ICONS[symbol]}</span>`;
}

/** Where the trip starts (a truck on a disc) and ends (a flag on a pin), as map apps mark them.
 * The level shows as a small badge when the weather there isn't low risk. */
export function endpointMarkerHtml(
  endpoint: Endpoint,
  level: RiskLevel,
): string {
  const icon = endpoint === "origin" ? Truck : Flag;
  return `<span class="endpoint-marker" data-endpoint="${endpoint}" data-level="${level}" aria-hidden="true">${icon}</span>`;
}

/** Where the truck is at the slider's hour: a ring around that checkpoint, with a truck on it.
 * It sits under the checkpoint's own marker, so the symbol stays visible and clickable. */
export function truckPositionMarkerHtml(): string {
  return `<span class="truck-position" aria-hidden="true">${Truck}</span>`;
}

/** What makes the shading risky at the slider's hour: the hazard's symbol on a callout in the
 * level's colour, floating just above the spot so the checkpoint there stays visible. Hidden from
 * screen readers; the marker's title and the forecast panel say it in words. */
export function corridorHazardMarkerHtml(
  kind: HazardKind | "unknown",
  level: RiskLevel,
): string {
  return `<span class="corridor-hazard" data-level="${level}" aria-hidden="true">${ICONS[kind]}</span>`;
}
