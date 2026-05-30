# Normalize Backend Planner Selected IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make backend `plan_laundry()` trim and dedupe selected and urgent item IDs, matching frontend planner behavior.

**Architecture:** Keep constraint shape validation unchanged, then derive normalized selected and urgent ID lists inside `plan_laundry()` before selected-item lookup and urgent membership validation.

**Tech Stack:** Python, `unittest`, `uv`.

---

### Task 1: Normalize backend planner selected IDs

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add a focused planner test near selected ID validation:

```python
def test_plan_normalizes_selected_and_urgent_item_ids(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]

    plan = plan_laundry(
        items,
        LaundryConstraints(
            selected_item_ids=[" white-tee ", "white-tee"],
            urgent_item_ids=[" white-tee "],
            allow_dryer=False,
        ),
        _campus_context(),
    )

    self.assertEqual(plan.buckets[0].item_ids, ["white-tee"])
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_normalizes_selected_and_urgent_item_ids -v`

Expected: FAIL because backend currently treats whitespace-padded IDs as missing.

- [x] **Step 3: Write minimal implementation**

In `plan_laundry()`, derive normalized IDs after `_validate_constraints`:

```python
selected_item_ids = _normalized_item_ids(constraints.selected_item_ids)
urgent_item_ids = _normalized_item_ids(constraints.urgent_item_ids)
selected_items = _selected_items(items, selected_item_ids)
_validate_urgent_items(selected_item_ids, urgent_item_ids)
```

Update `_validate_urgent_items` to accept normalized lists instead of the whole constraints object.

- [x] **Step 4: Run target backend test**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_normalizes_selected_and_urgent_item_ids -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_e_module -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-normalize-backend-planner-selected-ids.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: normalize backend planner item ids"
```

Expected: one local commit. Do not push or upload.
