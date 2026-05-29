# Validate Planner Item Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `plan_laundry` reject `WardrobeItem` objects with malformed `profile` values before item ids are read.

**Architecture:** Keep the guard in `backend/laundry/planner.py` at the `items` entry-point validation layer. Add a small `_validate_item` helper called by `_validate_items`, preserving existing planning behavior for valid items.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate planner item profile type

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add this test near `test_plan_requires_wardrobe_item_list`:

```python
def test_plan_requires_valid_item_profile(self) -> None:
    items = [WardrobeItem(profile="profile")]  # type: ignore[arg-type]

    with self.assertRaisesRegex(ValueError, r"items\[0\].profile"):
        plan_laundry(
            items,
            LaundryConstraints(selected_item_ids=["broken"]),
            _campus_context(),
        )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_item_profile -v`

Expected: FAIL because invalid profiles currently leak `AttributeError`.

- [x] **Step 3: Write minimal implementation**

Update the planner import:

```python
ClothingProfile,
```

Add:

```python
def _validate_item(item: WardrobeItem, field_name: str) -> None:
    if not isinstance(item.profile, ClothingProfile):
        raise ValueError(f"{field_name}.profile must be a ClothingProfile")
```

Then update `_validate_items`:

```python
for index, item in enumerate(value):
    if not isinstance(item, WardrobeItem):
        raise ValueError(f"items[{index}] must be a WardrobeItem")
    _validate_item(item, f"items[{index}]")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_item_profile -v`

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
git add docs/superpowers/plans/2026-05-30-validate-planner-item-profile.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate planner item profile"
```

Expected: one local commit. Do not push or upload.
