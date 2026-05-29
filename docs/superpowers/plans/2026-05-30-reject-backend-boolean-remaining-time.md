# Reject Backend Boolean Remaining Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent mock machine `remaining_minutes: true` from being treated as a one-minute countdown.

**Architecture:** Keep validation in the mock machine parsing boundary. Add a regression test through `LaundryMachineClient.list_machines()` with a mock JSON file, then reject booleans in `_optional_int`.

**Tech Stack:** Python 3.12, unittest, uv.

---

### Task 1: Reject Boolean Remaining Minutes

**Files:**
- Modify: `tests/test_campus_machine_api.py`
- Modify: `backend/campus/machine_api.py`

- [ ] **Step 1: Write the failing test**

Add a test in `tests/test_campus_machine_api.py` with a mock machine JSON file containing `remaining_minutes: True`. Assert that `client.list_machines()` raises `ValueError` mentioning `remaining_minutes`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_campus_machine_api -v
```

Expected: FAIL because Python currently treats `True` as an integer.

- [ ] **Step 3: Write minimal implementation**

In `backend/campus/machine_api.py`, update `_optional_int` so booleans are rejected before the integer type check.

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
git add docs/superpowers/plans/2026-05-30-reject-backend-boolean-remaining-time.md tests/test_campus_machine_api.py backend/campus/machine_api.py
git commit -m "fix: reject backend boolean remaining time"
```

Expected: a local-only commit. Do not push or upload.
