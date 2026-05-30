from __future__ import annotations

import unittest

from backend.campus.weather import fetch_tsinghua_weather


class CurrentWeatherTests(unittest.TestCase):
    def test_fetch_tsinghua_weather_normalizes_open_meteo_payload(self) -> None:
        def fake_transport(url: str, timeout_seconds: float) -> dict[str, object]:
            self.assertIn("latitude=40.002", url)
            self.assertIn("current=temperature_2m", url)
            self.assertLessEqual(timeout_seconds, 10)
            return {
                "current": {
                    "time": "2026-05-28T19:45",
                    "temperature_2m": 24.6,
                    "relative_humidity_2m": 71,
                    "precipitation": 0.1,
                    "weather_code": 61,
                },
                "current_units": {
                    "temperature_2m": "°C",
                    "relative_humidity_2m": "%",
                    "precipitation": "mm",
                    "weather_code": "wmo code",
                },
            }

        weather = fetch_tsinghua_weather(transport=fake_transport)

        self.assertEqual(weather["source"], "open-meteo")
        self.assertEqual(weather["status"], "live")
        self.assertEqual(weather["location"], "Tsinghua University")
        self.assertEqual(weather["current"]["temperature_2m"], 24.6)
        self.assertEqual(weather["units"]["relative_humidity_2m"], "%")

    def test_fetch_tsinghua_weather_returns_unavailable_on_transport_failure(self) -> None:
        def failing_transport(url: str, timeout_seconds: float) -> dict[str, object]:
            raise TimeoutError("network timeout")

        weather = fetch_tsinghua_weather(transport=failing_transport)

        self.assertEqual(weather["source"], "open-meteo")
        self.assertEqual(weather["status"], "unavailable")
        self.assertIn("network timeout", weather["error"])

    def test_fetch_tsinghua_weather_returns_unavailable_on_invalid_current_values(self) -> None:
        def fake_transport(url: str, timeout_seconds: float) -> dict[str, object]:
            return {
                "current": {
                    "temperature_2m": "warm",
                    "relative_humidity_2m": 71,
                    "precipitation": 0.0,
                    "weather_code": 0,
                }
            }

        weather = fetch_tsinghua_weather(transport=fake_transport)

        self.assertEqual(weather["status"], "unavailable")
        self.assertIn("invalid current weather", weather["error"])
        self.assertIn("temperature_2m", weather["error"])


if __name__ == "__main__":
    unittest.main()
