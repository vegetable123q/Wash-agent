# Backend Mock Machine Nonnegative Price Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject negative `price_yuan` values in backend mock machine records.

**Architecture:** Tighten `_optional_number` in `backend/campus/machine_api.py`; it is the single runtime parser for optional numeric machine fields in mock data.

**Tech Stack:** Python, unittest.

---

### Task 1: Reject negative mock machine prices

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-backend-mock-machine-nonnegative-price.md`
- Modify: `tests/test_campus_machine_api.py`
- Modify: `backend/campus/machine_api.py`

- [x] **Step 1: Add failing backend coverage**

Add a mock machine test with:

```python
"price_yuan": -1
```

and assert it raises `ValueError` mentioning `price_yuan`.

Run from repo root:

```bash
python -m unittest tests.test_campus_machine_api
```

Expected: FAIL because negative mock machine prices currently pass through parsing.

- [x] **Step 2: Implement non-negative number validation**

In `_optional_number`, reject values below zero.

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
git add docs/superpowers/plans/2026-05-30-backend-mock-machine-nonnegative-price.md tests/test_campus_machine_api.py backend/campus/machine_api.py
git commit -m "fix: reject negative mock machine price"
```

Expected: one local commit. Do not push or upload.
