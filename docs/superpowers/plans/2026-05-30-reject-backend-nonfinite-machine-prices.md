# Reject Backend Non-Finite Machine Prices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent backend machine adapters from accepting `NaN` or `Infinity` prices.

**Architecture:** Keep validation at the campus machine parsing boundary. Add regression tests for mock machine `price_yuan` and machine-rule `default_price_yuan`, then require optional numeric prices to be finite after conversion.

**Tech Stack:** Python 3.12, unittest, uv.

---

### Task 1: Reject Non-Finite Machine Prices

**Files:**
- Modify: `tests/test_campus_machine_api.py`
- Modify: `backend/campus/machine_api.py`

- [ ] **Step 1: Write the failing tests**

Add tests in `tests/test_campus_machine_api.py`:

- A mock machine JSON file with `price_yuan: float("nan")` should raise `ValueError` mentioning `price_yuan`.
- A machine rules file with `default_price_yuan: float("inf")` should raise `ValueError` mentioning `default_price_yuan`.

- [ ] **Step 2: Run tests to verify they fail**

Run:

```bash
uv run python -m unittest tests.test_campus_machine_api -v
```

Expected: FAIL because non-finite prices are currently converted to floats and accepted.

- [ ] **Step 3: Write minimal implementation**

In `backend/campus/machine_api.py`:

- Import `math`.
- In `_optional_number`, convert to `float`, require `math.isfinite(number)`, then return it.
- In `_optional_float`, require `math.isfinite(number)` after conversion.

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
git add docs/superpowers/plans/2026-05-30-reject-backend-nonfinite-machine-prices.md tests/test_campus_machine_api.py backend/campus/machine_api.py
git commit -m "fix: reject backend nonfinite machine prices"
```

Expected: a local-only commit. Do not push or upload.
