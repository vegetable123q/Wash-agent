# Backend Campus Queue Integer Remaining Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make backend campus queue estimates ignore invalid fractional running-machine remaining times instead of propagating them.

**Architecture:** Add a local runtime guard in `backend/campus/context.py` so queue aggregation only uses finite, non-negative integer remaining minutes.

**Tech Stack:** Python, pytest.

---

### Task 1: Guard backend queue estimate remaining minutes

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-backend-campus-queue-integer-remaining.md`
- Modify: `tests/test_campus_context.py`
- Modify: `backend/campus/context.py`

- [x] **Step 1: Add failing backend coverage**

Add a `build_campus_context` test with a running machine whose:

```python
remaining_minutes=1.5
```

and assert:

```python
self.assertIsNone(context.queue_estimates[0].estimated_wait_minutes)
```

Run from repo root:

```bash
python -m unittest tests.test_campus_context
```

Expected: FAIL because backend queue estimates currently propagate the fractional wait.

- [x] **Step 2: Implement backend integer filtering**

Add a helper:

```python
def _is_non_negative_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0
```

Use it in `_queue_estimates`.

- [x] **Step 3: Run target and backend verification**

Run from repo root:

```bash
python -m unittest tests.test_campus_context
python -m unittest discover tests
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 4: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-backend-campus-queue-integer-remaining.md tests/test_campus_context.py backend/campus/context.py
git commit -m "fix: guard backend campus queue remaining time"
```

Expected: one local commit. Do not push or upload.
