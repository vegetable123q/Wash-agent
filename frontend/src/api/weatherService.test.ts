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

  it("filters nonstring weather unit values", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 20,
            relative_humidity_2m: 50,
            precipitation: 0,
          },
          current_units: {
            temperature_2m: 123,
            precipitation: "mm",
          },
        }),
      }),
    );

    const snapshot = await fetchTsinghuaWeather();

    expect(snapshot.status).toBe("live");
    expect(snapshot.units).toEqual({ precipitation: "mm" });
  });

  it("trims weather unit strings and ignores blank units", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: 20,
            relative_humidity_2m: 50,
            precipitation: 0,
          },
          current_units: {
            temperature_2m: " °C ",
            relative_humidity_2m: "   ",
            precipitation: " mm ",
          },
        }),
      }),
    );

    const snapshot = await fetchTsinghuaWeather();

    expect(snapshot.status).toBe("live");
    expect(snapshot.units).toEqual({ temperature_2m: "°C", precipitation: "mm" });
  });
});
