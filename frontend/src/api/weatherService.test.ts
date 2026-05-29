import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTsinghuaWeather } from "./weatherService";

describe("fetchTsinghuaWeather", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unavailable when current weather values are invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: "warm",
            relative_humidity_2m: 50,
            precipitation: 0,
          },
          current_units: {},
        }),
      }),
    );

    const snapshot = await fetchTsinghuaWeather();

    expect(snapshot.status).toBe("unavailable");
    expect(snapshot.error).toContain("invalid current weather");
  });
});
