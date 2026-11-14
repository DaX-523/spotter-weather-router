import { describe, expect, it, vi } from "vitest";

import { ApiError, request } from "@/lib/api/client";

function respondWith(status: number, body: unknown) {
  const fetchMock = vi.fn().mockResolvedValue(
    new Response(typeof body === "string" ? body : JSON.stringify(body), {
      status,
      headers: { "Content-Type": "application/json" },
    }),
  );
  vi.stubGlobal("fetch", fetchMock);
  return fetchMock;
}

describe("request", () => {
  it("posts JSON to the versioned API on the same origin", async () => {
    const fetchMock = respondWith(200, { ok: true });

    const result = await request("POST", "/trip-plans", { body: { a: 1 } });

    expect(result).toEqual({ ok: true });
    expect(fetchMock).toHaveBeenCalledWith("/api/v1/trip-plans", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: '{"a":1}',
    });
  });

  it("sends query parameters", async () => {
    const fetchMock = respondWith(200, []);

    await request("GET", "/places", { query: { query: "Chicago, IL" } });

    expect(fetchMock.mock.calls[0][0]).toBe(
      "/api/v1/places?query=Chicago%2C+IL",
    );
  });

  it("uses VITE_API_BASE_URL when the API lives elsewhere", async () => {
    vi.stubEnv("VITE_API_BASE_URL", "https://api.example.com");
    const fetchMock = respondWith(200, []);

    await request("GET", "/places");

    expect(fetchMock.mock.calls[0][0]).toBe(
      "https://api.example.com/api/v1/places",
    );
  });

  it("turns the API's detail message into an ApiError", async () => {
    respondWith(503, { detail: "The weather service is not responding" });

    const error = await request("GET", "/places").catch((e: unknown) => e);

    expect(error).toEqual(
      new ApiError(503, "The weather service is not responding"),
    );
  });

  it("collects field errors, including nested ones, by field", async () => {
    respondWith(400, {
      departure_at: ["Departure must be between now and 48 hours from now"],
      origin: { lat: ["Ensure this value is less than or equal to 90."] },
    });

    const error = await request("POST", "/trip-plans").catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).fieldErrors).toEqual({
      departure_at: "Departure must be between now and 48 hours from now",
      origin: "Ensure this value is less than or equal to 90.",
    });
    expect((error as ApiError).message).toBe("Check the highlighted fields.");
  });

  it("explains an error response it cannot read", async () => {
    respondWith(502, "<html>Bad gateway</html>");

    const error = await request("GET", "/places").catch((e: unknown) => e);

    expect(error).toEqual(new ApiError(502, "Something went wrong (502)."));
  });

  it("still names the field when its error isn't text", async () => {
    respondWith(400, { load_weight_lb: [42] });

    const error = await request("POST", "/trip-plans").catch((e: unknown) => e);

    expect((error as ApiError).fieldErrors).toEqual({
      load_weight_lb: "This value is not valid.",
    });
  });

  it("explains when the server cannot be reached", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("offline")));

    const error = await request("GET", "/places").catch((e: unknown) => e);

    expect(error).toEqual(
      new ApiError(
        0,
        "Could not reach the server. Check your connection and try again.",
      ),
    );
  });
});
