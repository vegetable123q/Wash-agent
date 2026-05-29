# Reject Backend Boolean Machine Prices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent backend machine adapters from accepting boolean values as prices.

**Architecture:** Keep validation at the same campus machine parsing boundary as numeric price cleanup. Add regression tests for mock machine `price_yuan: true` and machine-rule `default_price_yuan: true`, then explicitly reject booleans before numeric conversion.

**Tech Stack:** Python 3.12, unittest, uv.

---

### Task 1: Reject Boolean Machine Prices

**Files:**
- Modify: `tests/test_campus_machine_api.py`
- Modify: `backend/campus/machine_api.py`

- [ ] **Step 1: Write the failing tests**

Add tests in `tests/test_campus_machine_api.py`:

- A mock machine JSON file with `price_yuan: True` should raise `ValueError` mentioning `price_yuan`.
- A machine rules file with `default_price_yuan: True` should raise `ValueError` mentioning `default_price_yuan`.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
uv run python -m unittest tests.test_campus_machine_api -v
```

Expected: FAIL because Python currently treats `bool` as an `int` for these checks.

- [ ] **Step 3: Write minimal implementation**

In `backend/campus/machine_api.py`, reject `bool` in both optional price helpers before numeric conversion.

- [ ] **Step 4: Run focused tests to verify they pass**

Run:

```bash
uv run python -m unittest tests.test_campus_machine_api -v
```

Expected: PASS for all campus machine API tests.

- [ ] **Step 5: Run full backend verification**

Run:

```bash
uv run python -m unittest discover -v
git diff --check
```

Expected: all backend tests pass and diff check exits cleanly.

- [ ] **Step 6: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-reject-backend-boolean-machine-prices.md tests/test_campus_machine_api.py backend/campus/machine_api.py
git commit -m "fix: reject backend boolean machine prices"
```

Expected: a local-only commit. Do not push or upload.
