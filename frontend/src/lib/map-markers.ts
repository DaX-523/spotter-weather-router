// Leaflet draws custom markers from HTML strings, so the symbols come from lucide-static: the same
// icons as lucide-react, as plain SVG.
import {
  CircleQuestionMark,
  CloudRain,
  OctagonX,
  Snowflake,
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

/** A checkpoint marker: the symbol on a disc in its level's colour (`.risk-marker` in
 * index.css). Hidden from screen readers; the marker's title names the risk. */
export function markerHtml(symbol: MarkerSymbol, level: RiskLevel): string {
  return `<span class="risk-marker" data-level="${level}" aria-hidden="true">${ICONS[symbol]}</span>`;
}
