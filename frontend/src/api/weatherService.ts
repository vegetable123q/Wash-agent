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
    if (!isValidCurrentWeather(current)) {
      throw new Error("Open-Meteo response invalid current weather");
    }

    return {
      source: "open-meteo",
      status: "live",
      location: "Tsinghua University",
      current: current as WeatherSnapshot["current"],
      units: unitStrings(units),
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

function isValidCurrentWeather(value: unknown): value is WeatherSnapshot["current"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const current = value as Record<string, unknown>;
  return [current.temperature_2m, current.relative_humidity_2m, current.precipitation].every(
    (item) => typeof item === "number" && Number.isFinite(item),
  );
}

function unitStrings(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string",
    ),
  );
}
