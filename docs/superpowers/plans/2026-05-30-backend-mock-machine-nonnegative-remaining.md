# Backend Mock Machine Nonnegative Remaining Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject negative `remaining_minutes` values in backend mock machine records.

**Architecture:** Tighten `_optional_int` in `backend/campus/machine_api.py`; it is the single runtime parser for optional integer machine fields in mock data.

**Tech Stack:** Python, unittest.

---

### Task 1: Reject negative mock remaining minutes

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-backend-mock-machine-nonnegative-remaining.md`
- Modify: `tests/test_campus_machine_api.py`
- Modify: `backend/campus/machine_api.py`

- [x] **Step 1: Add failing backend coverage**

Add a mock machine test with:

```python
"remaining_minutes": -1
```

and assert it raises `ValueError` mentioning `remaining_minutes`.

Run from repo root:

```bash
python -m unittest tests.test_campus_machine_api
```

Expected: FAIL because negative remaining minutes currently pass through mock machine parsing.

- [x] **Step 2: Implement non-negative integer validation**

In `_optional_int`, reject values below zero:

```python
if value < 0:
    raise ValueError(f"machine {field_name} must be non-negative")
```

- [x] **Step 3: Run target and backend verification**

Run from repo root:

```bash
python -m unittest tests.test_campus_machine_api
python -m unittest discover tests
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 4: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-backend-mock-machine-nonnegative-remaining.md tests/test_campus_machine_api.py backend/campus/machine_api.py
git commit -m "fix: reject negative mock remaining time"
```

Expected: one local commit. Do not push or upload.
