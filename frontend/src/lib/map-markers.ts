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

import type { RiskLevel } from "@/lib/api";
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
 * level's colour. Hidden from screen readers; the marker's title names the risk. */
export function checkpointMarkerHtml(
  symbol: MarkerSymbol | null,
  level: RiskLevel,
): string {
  if (symbol === null) {
    return '<span class="checkpoint-dot" aria-hidden="true"></span>';
  }
  return `<span class="risk-marker" data-level="${level}" aria-hidden="true">${ICONS[symbol]}</span>`;
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
