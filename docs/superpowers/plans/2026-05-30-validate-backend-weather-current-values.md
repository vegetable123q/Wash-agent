# Validate Backend Weather Current Values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Treat malformed Open-Meteo current weather values as unavailable instead of returning a live weather snapshot with bad data.

**Architecture:** Keep validation local to `backend/campus/weather.py`, immediately after confirming `payload["current"]` is a dict and before returning the live snapshot.

**Tech Stack:** Python validation, `unittest`, `uv`.

---

### Task 1: Validate current weather values

**Files:**
- Modify: `tests/test_weather_current.py`
- Modify: `backend/campus/weather.py`

- [x] **Step 1: Write the failing test**

Add:

```python
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
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_weather_current.CurrentWeatherTests.test_fetch_tsinghua_weather_returns_unavailable_on_invalid_current_values -v`

Expected: FAIL because invalid current values are currently returned as live data.

- [x] **Step 3: Write minimal implementation**

Add numeric validation for:

```python
temperature_2m
relative_humidity_2m
precipitation
weather_code
```

Reject bools, non-numeric values, and non-finite numbers with `ValueError("Open-Meteo response invalid current weather: <field>")`.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_weather_current.CurrentWeatherTests.test_fetch_tsinghua_weather_returns_unavailable_on_invalid_current_values -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_weather_current -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-backend-weather-current-values.md tests/test_weather_current.py backend/campus/weather.py
git commit -m "fix: validate backend weather current values"
```

Expected: one local commit. Do not push or upload.
