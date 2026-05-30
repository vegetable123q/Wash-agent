# Backend Planner Integer Program Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the backend planner reject fractional program durations instead of truncating them with `int(...)`.

**Architecture:** Add duration-specific validation inside planner pricing lookup. `price_yuan` stays a finite non-negative number; `duration_minutes` must be a finite positive integer.

**Tech Stack:** Python, unittest.

---

### Task 1: Validate backend planner program durations

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-backend-planner-integer-program-duration.md`
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Add failing backend coverage**

Add a planner test with:

```python
context.pricing_rules["wash_programs"]["standard"]["duration_minutes"] = 1.5
```

and assert it raises `ValueError` mentioning `wash program standard duration_minutes`.

Run from repo root:

```bash
python -m unittest tests.test_e_module
```

Expected: FAIL because backend planner currently truncates fractional durations.

- [x] **Step 2: Implement positive integer duration validation**

After `_number(...)`, reject non-integer or non-positive `duration_minutes` values.

- [x] **Step 3: Run target and backend verification**

Run from repo root:

```bash
python -m unittest tests.test_e_module
python -m unittest discover tests
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 4: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-backend-planner-integer-program-duration.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate backend planner program durations"
```

Expected: one local commit. Do not push or upload.
