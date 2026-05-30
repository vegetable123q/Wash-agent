"""Current weather adapter for campus context."""

from __future__ import annotations

import json
import math
from typing import Any, Callable
from urllib.parse import urlencode
from urllib.request import urlopen


WeatherTransport = Callable[[str, float], dict[str, Any]]

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
TSINGHUA_LOCATION = {
    "name": "Tsinghua University",
    "latitude": 40.0023,
    "longitude": 116.3268,
}
CURRENT_NUMERIC_FIELDS = (
    "temperature_2m",
    "relative_humidity_2m",
    "precipitation",
    "weather_code",
)


def fetch_tsinghua_weather(
    *,
    transport: WeatherTransport | None = None,
    timeout_seconds: float = 8.0,
) -> dict[str, Any]:
    """Fetch the current weather around Tsinghua University."""

    fetcher = transport or _urllib_transport
    url = _open_meteo_url()
    try:
        payload = fetcher(url, timeout_seconds)
        current = payload.get("current")
        if not isinstance(current, dict):
            raise ValueError("Open-Meteo response missing current weather")
        _validate_current_weather(current)
        units = payload.get("current_units")
        if not isinstance(units, dict):
            units = {}
        return {
            "source": "open-meteo",
            "status": "live",
            "location": TSINGHUA_LOCATION["name"],
            "latitude": TSINGHUA_LOCATION["latitude"],
            "longitude": TSINGHUA_LOCATION["longitude"],
            "current": dict(current),
            "units": dict(units),
        }
    except Exception as exc:  # pragma: no cover - exact network errors are platform-specific.
        return {
            "source": "open-meteo",
            "status": "unavailable",
            "location": TSINGHUA_LOCATION["name"],
            "error": str(exc),
        }


def _open_meteo_url() -> str:
    query = urlencode(
        {
            "latitude": TSINGHUA_LOCATION["latitude"],
            "longitude": TSINGHUA_LOCATION["longitude"],
            "current": ",".join(
                [
                    "temperature_2m",
                    "relative_humidity_2m",
                    "precipitation",
                    "weather_code",
                ]
            ),
            "timezone": "Asia/Shanghai",
        }
    )
    return f"{OPEN_METEO_FORECAST_URL}?{query}"


def _validate_current_weather(current: dict[str, Any]) -> None:
    for field_name in CURRENT_NUMERIC_FIELDS:
        value = current.get(field_name)
        if isinstance(value, bool) or not isinstance(value, int | float):
            raise ValueError(f"Open-Meteo response invalid current weather: {field_name}")
        if not math.isfinite(float(value)):
            raise ValueError(f"Open-Meteo response invalid current weather: {field_name}")


def _urllib_transport(url: str, timeout_seconds: float) -> dict[str, Any]:
    with urlopen(url, timeout=timeout_seconds) as response:
        return json.loads(response.read().decode("utf-8"))
