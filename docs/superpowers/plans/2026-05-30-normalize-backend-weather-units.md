# Normalize Backend Weather Units Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return clean Open-Meteo unit metadata from the backend weather adapter by trimming unit strings and dropping invalid unit values.

**Architecture:** Keep unit normalization local to `backend/campus/weather.py` by replacing the raw `dict(units)` return with a `_normalize_units` helper.

**Tech Stack:** Python dict normalization, `unittest`, `uv`.

---

### Task 1: Normalize unit metadata

**Files:**
- Modify: `tests/test_weather_current.py`
- Modify: `backend/campus/weather.py`

- [x] **Step 1: Write the failing test**

Add:

```python
def test_fetch_tsinghua_weather_trims_and_filters_units(self) -> None:
    def fake_transport(url: str, timeout_seconds: float) -> dict[str, object]:
        return {
            "current": {
                "temperature_2m": 24.6,
                "relative_humidity_2m": 71,
                "precipitation": 0.0,
                "weather_code": 0,
            },
            "current_units": {
                "temperature_2m": " °C ",
                "relative_humidity_2m": "%",
                "precipitation": " ",
                "weather_code": 123,
            },
        }

    weather = fetch_tsinghua_weather(transport=fake_transport)

    self.assertEqual(
        weather["units"],
        {"temperature_2m": "°C", "relative_humidity_2m": "%"},
    )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_weather_current.CurrentWeatherTests.test_fetch_tsinghua_weather_trims_and_filters_units -v`

Expected: FAIL because units are currently returned without trimming or filtering.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _normalize_units(units: dict[str, Any]) -> dict[str, str]:
    normalized: dict[str, str] = {}
    for key, value in units.items():
        if not isinstance(value, str):
            continue
        unit = value.strip()
        if unit:
            normalized[str(key)] = unit
    return normalized
```

Use it in `fetch_tsinghua_weather`:

```python
"units": _normalize_units(units),
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_weather_current.CurrentWeatherTests.test_fetch_tsinghua_weather_trims_and_filters_units -v`

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
git add docs/superpowers/plans/2026-05-30-normalize-backend-weather-units.md tests/test_weather_current.py backend/campus/weather.py
git commit -m "fix: normalize backend weather units"
```

Expected: one local commit. Do not push or upload.
