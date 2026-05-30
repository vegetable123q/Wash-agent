# Validate Weather Timeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject malformed weather timeout values before they reach the transport layer.

**Architecture:** Add a small timeout validator in `backend/campus/weather.py` and call it inside `fetch_tsinghua_weather` before the transport is invoked. Invalid timeouts should follow the adapter's existing unavailable-weather path instead of calling network or fake transports with bad values.

**Tech Stack:** Python validation helpers, `unittest`, `uv`.

---

### Task 1: Validate weather timeout values

**Files:**
- Modify: `tests/test_weather_current.py`
- Modify: `backend/campus/weather.py`

- [x] **Step 1: Write the failing test**

Add:

```python
def test_fetch_tsinghua_weather_rejects_invalid_timeout_before_transport(self) -> None:
    calls: list[object] = []

    def unused_transport(url: str, timeout_seconds: float) -> dict[str, object]:
        calls.append(timeout_seconds)
        raise RuntimeError("transport called unexpectedly")

    for timeout_seconds in (True, 0, -1, float("inf"), "8"):
        with self.subTest(timeout_seconds=timeout_seconds):
            calls.clear()
            weather = fetch_tsinghua_weather(
                transport=unused_transport,
                timeout_seconds=timeout_seconds,  # type: ignore[arg-type]
            )

            self.assertEqual(calls, [])
            self.assertEqual(weather["status"], "unavailable")
            self.assertIn("invalid timeout_seconds", weather["error"])
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_weather_current.CurrentWeatherTests.test_fetch_tsinghua_weather_rejects_invalid_timeout_before_transport -v`

Expected: FAIL because invalid values currently reach the transport.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _validate_timeout_seconds(timeout_seconds: object) -> float:
    if isinstance(timeout_seconds, bool) or not isinstance(timeout_seconds, int | float):
        raise ValueError("invalid timeout_seconds")
    timeout = float(timeout_seconds)
    if timeout <= 0 or not math.isfinite(timeout):
        raise ValueError("invalid timeout_seconds")
    return timeout
```

Call it before invoking the transport:

```python
timeout = _validate_timeout_seconds(timeout_seconds)
payload = fetcher(url, timeout)
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_weather_current.CurrentWeatherTests.test_fetch_tsinghua_weather_rejects_invalid_timeout_before_transport -v`

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
git add docs/superpowers/plans/2026-05-30-validate-weather-timeout.md tests/test_weather_current.py backend/campus/weather.py
git commit -m "fix: validate weather timeout"
```

Expected: one local commit. Do not push or upload.
