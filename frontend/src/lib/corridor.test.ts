import { describe, expect, it } from "vitest";

import type { Corridor, Hazard, HazardKind, RiskLevel } from "@/lib/api";
import {
  CORRIDOR_HOURS,
  corridorPeak,
  corridorRadiusMeters,
  forecastHourLabel,
  hazardCause,
  hazardsAt,
  hourOffsetLabel,
  hourlyWorst,
  levelCounts,
  reasonsAt,
  sliderHour,
  worstLevel,
} from "@/lib/corridor";
import { TRIP_PLAN } from "@/test/fixtures";

const START = "2026-11-14T15:00:00Z"; // 9:00 AM in Chicago

describe("forecastHourLabel", () => {
  it.each([
    [0, "Now · Sat, 9:00 AM CST"],
    [1, "+1 h · Sat, 10:00 AM CST"],
    [CORRIDOR_HOURS, "+48 h · Mon, 9:00 AM CST"],
  ])("labels hour %i as %s in the origin's time", (hour, expected) => {
    expect(forecastHourLabel(START, hour, "America/Chicago")).toBe(expected);
  });

  it("uses the origin's time zone, wherever the driver is", () => {
    expect(forecastHourLabel(START, 0, "America/Denver")).toBe(
      "Now · Sat, 8:00 AM MST",
    );
  });
});

describe("corridorRadiusMeters", () => {
  it.each([
    [10, 9_656],
    [50, 48_280],
  ])(
    "makes neighbouring checkpoints %i mi apart overlap into one band",
    (spacingMi, expected) => {
      expect(corridorRadiusMeters(spacingMi)).toBe(expected);
    },
  );
});

describe("sliderHour", () => {
  it.each([
    [7, 7],
    [[7], 7],
  ])("reads the slider's value %o as hour %i", (value, expected) => {
    expect(sliderHour(value)).toBe(expected);
  });
});

describe("hourOffsetLabel", () => {
  it.each([
    [0, "Now"],
    [6, "+6 h"],
    [CORRIDOR_HOURS, "+48 h"],
  ])("calls hour %i %s", (hour, expected) => {
    expect(hourOffsetLabel(hour)).toBe(expected);
  });
});

describe("worstLevel", () => {
  it.each<[RiskLevel[], RiskLevel]>([
    [["low", "moderate"], "moderate"],
    [["moderate", "high"], "high"],
    [["high", "severe"], "severe"],
    [["severe", "no_travel"], "no_travel"],
    [["low", "unknown"], "unknown"],
    [["moderate", "unknown"], "unknown"],
    [["unknown", "high"], "high"],
  ])("picks the worst of %o: %s", (levels, expected) => {
    expect(worstLevel(levels)).toBe(expected);
  });

  it("calls no levels at all unknown, never low", () => {
    expect(worstLevel([])).toBe("unknown");
  });
});

describe("hourlyWorst", () => {
  it("gives the corridor's worst level for each of its 49 hours", () => {
    expect(hourlyWorst(TRIP_PLAN.corridor)).toEqual([
      ...Array(6).fill("low"),
      ...Array(43).fill("severe"),
    ]);
  });
});

describe("levelCounts", () => {
  it.each([
    [0, [{ level: "low", count: 2 }]],
    [
      6,
      [
        { level: "low", count: 1 },
        { level: "severe", count: 1 },
      ],
    ],
  ])(
    "counts the corridor's checkpoints by level at hour %i",
    (hour, expected) => {
      expect(levelCounts(TRIP_PLAN.corridor, hour)).toEqual(expected);
    },
  );
});

describe("corridorPeak", () => {
  it("finds the worst level ahead and the first hour it is forecast", () => {
    expect(corridorPeak(hourlyWorst(TRIP_PLAN.corridor))).toEqual({
      level: "severe",
      hour: 6,
    });
  });

  it("starts at now when every hour is low risk", () => {
    expect(corridorPeak(Array(49).fill("low"))).toEqual({
      level: "low",
      hour: 0,
    });
  });
});

const A = { lat: 40, lon: -90 };
const B = { lat: 41, lon: -91 };
const RAIN: Hazard = {
  kind: "rain",
  level: "moderate",
  reason: "Rain 0.12 in/hr",
};
const WIND: Hazard = { kind: "wind", level: "high", reason: "Wind 38 mph" };

/** A corridor with one hour, 0, and these points' levels and hazards. */
function oneHour(
  ...points: { coordinate?: typeof A; level: RiskLevel; hazards: Hazard[] }[]
): Corridor {
  return {
    start_at: START,
    points: points.map(({ coordinate = A, level, hazards }) => ({
      coordinate,
      levels: [level],
      hazards: [hazards],
    })),
  };
}

describe("hazardsAt", () => {
  it("is empty when every checkpoint is low risk", () => {
    expect(hazardsAt(TRIP_PLAN.corridor, 0)).toEqual([]);
  });

  it("says what makes each risky checkpoint so, worst first", () => {
    const corridor = oneHour(
      { coordinate: A, level: "moderate", hazards: [RAIN] },
      { coordinate: B, level: "high", hazards: [WIND, RAIN] },
    );

    expect(hazardsAt(corridor, 0)).toEqual([
      {
        coordinate: B,
        level: "high",
        kind: "wind",
        title: "High: Wind 38 mph; Rain 0.12 in/hr",
      },
      {
        coordinate: A,
        level: "moderate",
        kind: "rain",
        title: "Moderate: Rain 0.12 in/hr",
      },
    ]);
  });

  it("names the hazard behind No Travel, not just the level", () => {
    const corridor = oneHour({
      level: "no_travel",
      hazards: [{ kind: "wind", level: "no_travel", reason: "Wind 58 mph" }],
    });

    expect(hazardsAt(corridor, 0)[0].kind).toBe("wind");
  });

  it("shows a level its reasons don't explain as unknown, never a guessed hazard", () => {
    const corridor = oneHour({ level: "high", hazards: [] });

    expect(hazardsAt(corridor, 0)[0].kind).toBe("unknown");
  });

  it("marks a missing forecast as unknown", () => {
    const corridor = oneHour({
      level: "unknown",
      hazards: [{ kind: "wind", level: "unknown", reason: "No wind forecast" }],
    });

    expect(hazardsAt(corridor, 0)[0].kind).toBe("unknown");
  });
});

describe("hazardCause", () => {
  it.each<[HazardKind[], string]>([
    [["wind"], "wind"],
    [["rain", "wind"], "wind and rain"],
    [["snow", "rain", "wind"], "wind, rain and snow"],
  ])("puts hazards %o into words: %s", (kinds, expected) => {
    const corridor = oneHour(
      ...kinds.map((kind) => ({
        level: "high" as const,
        hazards: [{ kind, level: "high" as const, reason: "" }],
      })),
    );

    expect(hazardCause(corridor, 0, "high")).toBe(expected);
  });

  it("counts only the hazards at that level", () => {
    const corridor = oneHour({ level: "high", hazards: [WIND, RAIN] });

    expect(hazardCause(corridor, 0, "high")).toBe("wind");
  });

  it("calls a missing forecast what it is", () => {
    const corridor = oneHour({
      level: "unknown",
      hazards: [{ kind: "wind", level: "unknown", reason: "No wind forecast" }],
    });

    expect(hazardCause(corridor, 0, "unknown")).toBe("no forecast");
  });
});

describe("reasonsAt", () => {
  it("lists each reason once, worst first", () => {
    const corridor = oneHour(
      { coordinate: A, level: "moderate", hazards: [RAIN] },
      { coordinate: B, level: "moderate", hazards: [RAIN] },
      { coordinate: B, level: "high", hazards: [WIND] },
    );

    expect(reasonsAt(corridor, 0)).toEqual([
      "High: Wind 38 mph",
      "Moderate: Rain 0.12 in/hr",
    ]);
  });
});
