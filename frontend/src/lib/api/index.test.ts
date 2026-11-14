import { describe, expect, it, vi } from "vitest";

import { planTrip, searchPlaces } from "@/lib/api";
import { request } from "@/lib/api/client";
import { CHICAGO, TRIP_PLAN } from "@/test/fixtures";

vi.mock("@/lib/api/client", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/api/client")>()),
  request: vi.fn(),
}));

describe("the API's endpoints", () => {
  it("plans a trip", async () => {
    vi.mocked(request).mockResolvedValue(TRIP_PLAN);
    const trip = {
      origin: CHICAGO.coordinate,
      destination: CHICAGO.coordinate,
      departure_at: "2026-11-14T15:00:00.000Z",
      load_weight_lb: 1,
    };

    await expect(planTrip(trip)).resolves.toBe(TRIP_PLAN);
    expect(request).toHaveBeenCalledWith("POST", "/trip-plans", {
      body: trip,
    });
  });

  it("searches places", async () => {
    vi.mocked(request).mockResolvedValue([CHICAGO]);

    await expect(searchPlaces("Chi")).resolves.toEqual([CHICAGO]);
    expect(request).toHaveBeenCalledWith("GET", "/places", {
      query: { query: "Chi" },
    });
  });
});
