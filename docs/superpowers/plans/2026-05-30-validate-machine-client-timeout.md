# Validate Machine Client Timeout Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject malformed machine API timeout values at client construction time.

**Architecture:** Normalize `LaundryMachineClient.timeout_seconds` through a tiny validator in `backend/campus/machine_api.py`. This keeps invalid timeout values from reaching real HTTP requests and mirrors the numeric validation style already used for machine prices and remaining minutes.

**Tech Stack:** Python validation helpers, `unittest`, `uv`.

---

### Task 1: Validate machine client timeout values

**Files:**
- Modify: `tests/test_campus_machine_api.py`
- Modify: `backend/campus/machine_api.py`

- [x] **Step 1: Write the failing test**

Add:

```python
def test_machine_client_rejects_invalid_timeout_seconds(self) -> None:
    for timeout_seconds in (True, 0, -1, float("inf"), "20"):
        with self.subTest(timeout_seconds=timeout_seconds):
            with self.assertRaisesRegex(ValueError, "timeout_seconds"):
                LaundryMachineClient(
                    timeout_seconds=timeout_seconds,  # type: ignore[arg-type]
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_campus_machine_api.CampusMachineApiTests.test_machine_client_rejects_invalid_timeout_seconds -v`

Expected: FAIL because the client currently accepts malformed timeout values.

- [x] **Step 3: Write minimal implementation**

In `LaundryMachineClient.__init__`, replace:

```python
self.timeout_seconds = timeout_seconds
```

with:

```python
self.timeout_seconds = _validate_timeout_seconds(timeout_seconds)
```

Add:

```python
def _validate_timeout_seconds(timeout_seconds: object) -> float:
    if isinstance(timeout_seconds, bool) or not isinstance(timeout_seconds, int | float):
        raise ValueError("timeout_seconds must be a positive finite number")
    timeout = float(timeout_seconds)
    if timeout <= 0 or not math.isfinite(timeout):
        raise ValueError("timeout_seconds must be a positive finite number")
    return timeout
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_campus_machine_api.CampusMachineApiTests.test_machine_client_rejects_invalid_timeout_seconds -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_campus_machine_api -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-machine-client-timeout.md tests/test_campus_machine_api.py backend/campus/machine_api.py
git commit -m "fix: validate machine client timeout"
```

Expected: one local commit. Do not push or upload.
