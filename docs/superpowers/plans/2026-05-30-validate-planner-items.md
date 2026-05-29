# Validate Planner Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make laundry planning reject malformed `items` inputs before planner internals access `WardrobeItem.profile`.

**Architecture:** Keep validation at the `plan_laundry` entry point in `backend/laundry/planner.py`. Add a small `_validate_items` helper that accepts only a list of `WardrobeItem` objects and reports indexed errors for malformed elements.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject malformed planner items

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing constraint validation tests:

```python
def test_plan_requires_wardrobe_item_list(self) -> None:
    invalid_items: list[object] = ["items", [object()], [True]]
    for items in invalid_items:
        with self.subTest(items=items):
            with self.assertRaisesRegex(ValueError, "items"):
                plan_laundry(
                    items,  # type: ignore[arg-type]
                    LaundryConstraints(selected_item_ids=["white-tee"]),
                    _campus_context(),
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_wardrobe_item_list -v`

Expected: FAIL because malformed `items` currently reach planner internals and can raise unrelated errors.

- [x] **Step 3: Write minimal implementation**

In `plan_laundry`, validate items before constraints and selection:

```python
_validate_items(items)
```

Add:

```python
def _validate_items(value: object) -> None:
    if not isinstance(value, list):
        raise ValueError("items must be a list")
    for index, item in enumerate(value):
        if not isinstance(item, WardrobeItem):
            raise ValueError(f"items[{index}] must be a WardrobeItem")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_wardrobe_item_list -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_e_module -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [ ] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-planner-items.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate planner items"
```

Expected: one local commit. Do not push or upload.
