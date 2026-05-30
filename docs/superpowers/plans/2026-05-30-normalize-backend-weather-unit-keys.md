# Normalize Backend Weather Unit Keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent malformed Open-Meteo unit keys from leaking into backend weather snapshots.

**Architecture:** Tighten `_normalize_units` in `backend/campus/weather.py` so it only accepts non-empty string keys, trimming both keys and values.

**Tech Stack:** Python dict normalization, `unittest`, `uv`.

---

### Task 1: Normalize unit keys

**Files:**
- Modify: `tests/test_weather_current.py`
- Modify: `backend/campus/weather.py`

- [x] **Step 1: Write the failing test**

Add:

```python
def test_fetch_tsinghua_weather_trims_and_filters_unit_keys(self) -> None:
    def fake_transport(url: str, timeout_seconds: float) -> dict[str, object]:
        return {
            "current": {
                "temperature_2m": 24.6,
                "relative_humidity_2m": 71,
                "precipitation": 0.0,
                "weather_code": 0,
            },
            "current_units": {
                " temperature_2m ": " °C ",
                "": "%",
                42: "bad",
            },
        }

    weather = fetch_tsinghua_weather(transport=fake_transport)

    self.assertEqual(weather["units"], {"temperature_2m": "°C"})
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_weather_current.CurrentWeatherTests.test_fetch_tsinghua_weather_trims_and_filters_unit_keys -v`

Expected: FAIL because malformed keys are currently stringified or preserved.

- [x] **Step 3: Write minimal implementation**

Update `_normalize_units`:

```python
if not isinstance(key, str):
    continue
unit_key = key.strip()
if not unit_key:
    continue
...
normalized[unit_key] = unit
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_weather_current.CurrentWeatherTests.test_fetch_tsinghua_weather_trims_and_filters_unit_keys -v`

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
git add docs/superpowers/plans/2026-05-30-normalize-backend-weather-unit-keys.md tests/test_weather_current.py backend/campus/weather.py
git commit -m "fix: normalize backend weather unit keys"
```

Expected: one local commit. Do not push or upload.
