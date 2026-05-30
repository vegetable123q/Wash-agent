# Validate Planner Unique Item IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `plan_laundry()` reject duplicate wardrobe item IDs before selected item lookup silently overwrites one item with another.

**Architecture:** Extend `_validate_items()` after each `WardrobeItem` is fully validated. Track `item.profile.item_id` values and raise a clear duplicate-ID `ValueError` when a repeated ID is found.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject duplicate planner item IDs

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add a focused test near existing planner item validation coverage:

```python
def test_plan_requires_unique_item_ids(self) -> None:
    items = [
        _item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0}),
        _item("white-tee", "duplicate white tee", colors=["white"], materials={"cotton": 1.0}),
    ]

    with self.assertRaisesRegex(ValueError, "duplicate.*white-tee"):
        plan_laundry(
            items,
            LaundryConstraints(selected_item_ids=["white-tee"]),
            _campus_context(),
        )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_unique_item_ids -v`

Expected: FAIL because duplicate IDs currently pass validation and selected-item lookup silently keeps the later item.

- [x] **Step 3: Write minimal implementation**

In `_validate_items()`:

```python
seen_item_ids: set[str] = set()
...
item_id = item.profile.item_id.strip()
if item_id in seen_item_ids:
    raise ValueError(f"items duplicate item_id: {item_id}")
seen_item_ids.add(item_id)
```

Place this after `_validate_item(...)` so malformed IDs keep their current field-specific errors.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_unique_item_ids -v`

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
git add docs/superpowers/plans/2026-05-30-validate-planner-unique-item-ids.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate planner unique item ids"
```

Expected: one local commit. Do not push or upload.
