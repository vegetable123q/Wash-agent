/**
 * Current weather adapter — fetches from Open-Meteo for Tsinghua campus.
 * Mirrors backend/campus/weather.py.
 */

import type { WeatherSnapshot } from "./types";
export type { WeatherSnapshot };

const OPEN_METEO_URL = "https://api.open-meteo.com/v1/forecast";
const TSINGHUA_LAT = 40.0023;
const TSINGHUA_LNG = 116.3268;

export async function fetchTsinghuaWeather(): Promise<WeatherSnapshot> {
  const params = new URLSearchParams({
    latitude: String(TSINGHUA_LAT),
    longitude: String(TSINGHUA_LNG),
    current: "temperature_2m,relative_humidity_2m,precipitation,weather_code",
    timezone: "Asia/Shanghai",
  });

  try {
    const response = await fetch(`${OPEN_METEO_URL}?${params}`);
    if (!response.ok) {
      throw new Error(`Open-Meteo returned ${response.status}`);
    }
    const payload: Record<string, unknown> = await response.json();
    const current = payload.current;
    const units = payload.current_units;

    if (!current || typeof current !== "object") {
      throw new Error("Open-Meteo response missing current weather");
    }

    return {
      source: "open-meteo",
      status: "live",
      location: "Tsinghua University",
      current: current as WeatherSnapshot["current"],
      units: typeof units === "object" && units ? (units as Record<string, string>) : {},
    };
  } catch (error) {
    return {
      source: "open-meteo",
      status: "unavailable",
      location: "Tsinghua University",
      error: error instanceof Error ? error.message : String(error),
    };
  }
}
