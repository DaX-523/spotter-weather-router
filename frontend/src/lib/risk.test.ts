import { describe, expect, it } from "vitest";

import type { CheckpointRisk, RouteRisk } from "@/lib/api";
import {
  RISK_LEVELS,
  markerSymbol,
  markerTitle,
  riskColorToken,
  riskHeading,
  riskLabel,
  riskMiles,
} from "@/lib/risk";
import { CLEAR_START, UNKNOWN_END, WINDY_MILE_50 } from "@/test/fixtures";

const CLEAR: RouteRisk = {
  level: "low",
  no_travel_mi: 0,
  severe_mi: 0,
  high_mi: 0,
  average_score: 0,
};

describe("riskLabel", () => {
  it("names every level the way drivers read it", () => {
    expect(RISK_LEVELS.map(riskLabel)).toEqual([
      "Low",
      "Moderate",
      "High",
      "Severe",
      "No Travel",
      "Unknown",
    ]);
  });
});

describe("riskColorToken", () => {
  it("names each level's theme colour", () => {
    expect(RISK_LEVELS.map(riskColorToken)).toEqual([
      "risk-low",
      "risk-moderate",
      "risk-high",
      "risk-severe",
      "risk-no-travel",
      "risk-unknown",
    ]);
  });
});

describe("markerSymbol", () => {
  it("draws no symbol where the risk is low", () => {
    expect(markerSymbol(CLEAR_START.risk)).toBeNull();
  });

  it("shows the hazard that sets the level", () => {
    expect(markerSymbol(WINDY_MILE_50.risk)).toBe("wind");
  });

  it("skips a missing reading to find that hazard", () => {
    const risk: CheckpointRisk = {
      level: "high",
      hazards: [
        { kind: "wind", level: "unknown", reason: "No wind forecast" },
        { kind: "rain", level: "high", reason: "Rain 0.30 in/hr" },
      ],
    };

    expect(markerSymbol(risk)).toBe("rain");
  });

  it.each([
    ["no_travel", "no-travel"],
    ["unknown", "unknown"],
  ] as const)("marks %s with its own symbol", (level, symbol) => {
    expect(markerSymbol({ level, hazards: [] })).toBe(symbol);
  });

  it("falls back to the unknown symbol when no hazard explains the level", () => {
    expect(markerSymbol({ level: "high", hazards: [] })).toBe("unknown");
  });
});

describe("riskHeading", () => {
  it.each<[string, CheckpointRisk, string]>([
    ["low-risk", CLEAR_START.risk, "Low risk"],
    ["windy", WINDY_MILE_50.risk, "Severe · wind"],
    [
      "No Travel",
      {
        level: "no_travel",
        hazards: [{ kind: "wind", level: "no_travel", reason: "Wind 58 mph" }],
      },
      "No Travel · wind",
    ],
    ["forecast-less", UNKNOWN_END.risk, "Unknown · no forecast"],
  ])("sums up a %s checkpoint in a few words", (_, risk, expected) => {
    expect(riskHeading(risk)).toBe(expected);
  });

  it("can join with a comma, for screen readers", () => {
    expect(riskHeading(WINDY_MILE_50.risk, ", ")).toBe("Severe, wind");
  });
});

describe("markerTitle", () => {
  it("names the level and every hazard", () => {
    expect(markerTitle(WINDY_MILE_50.risk)).toBe(
      "Severe: Wind 48 mph; Rain 0.12 in/hr",
    );
  });

  it("says when the risk is low", () => {
    expect(markerTitle(CLEAR_START.risk)).toBe("Low risk");
  });

  it("explains an unknown risk", () => {
    expect(markerTitle(UNKNOWN_END.risk)).toBe(
      "Unknown: No wind forecast; No rain forecast; No snow forecast",
    );
  });
});

describe("riskMiles", () => {
  it.each([
    [CLEAR, "No severe or high-risk miles"],
    [
      { ...CLEAR, severe_mi: 100.4, high_mi: 870.3 },
      "100 mi severe · 870 mi high or unknown",
    ],
    [{ ...CLEAR, no_travel_mi: 25 }, "25 mi No Travel"],
    [{ ...CLEAR, severe_mi: 0.3 }, "<1 mi severe"],
  ])("summarises %o as %s", (risk, expected) => {
    expect(riskMiles(risk)).toBe(expected);
  });
});
