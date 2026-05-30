# Backend Machine Rules Nonnegative Price Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject negative `default_price_yuan` values in backend machine rules.

**Architecture:** Reuse the existing machine-rule numeric parsing path. `_optional_float` already handles bool, type, and finite checks; add a non-negative check because its only current caller is machine price normalization.

**Tech Stack:** Python, unittest.

---

### Task 1: Reject negative machine rule default prices

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-backend-machine-rules-nonnegative-price.md`
- Modify: `tests/test_campus_machine_api.py`
- Modify: `backend/campus/machine_api.py`

- [x] **Step 1: Add failing machine-rule price coverage**

Add a test that sets:

```python
rules["washer_types"]["standard_washer"]["default_price_yuan"] = -1
```

and asserts `client.list_machines(...)` raises `ValueError` mentioning `default_price_yuan`.

Run from repo root:

```bash
python -m unittest tests.test_campus_machine_api
```

Expected: FAIL because negative default prices are currently accepted.

- [x] **Step 2: Implement non-negative price validation**

In `_optional_float`, after finite validation:

```python
if number < 0:
    raise ValueError(f"machine_rules {field_name} must be non-negative")
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

Run from repo root:

```bash
git add docs/superpowers/plans/2026-05-30-backend-machine-rules-nonnegative-price.md tests/test_campus_machine_api.py backend/campus/machine_api.py
git commit -m "fix: reject negative machine rule prices"
```

Expected: one local commit. Do not push or upload.
