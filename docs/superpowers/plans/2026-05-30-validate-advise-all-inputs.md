# Validate Advise All Inputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `advise_all_frequencies` reject malformed `items` and `constraints` inputs before batch recommendation logic iterates invalid data or silently returns an empty result.

**Architecture:** Add an `_validate_items` helper in `backend/wardrobe/frequency_advisor.py` and call it, along with the existing `_validate_constraints`, at the top of `advise_all_frequencies`.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Validate advise_all_frequencies inputs

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [x] **Step 1: Write the failing test**

Add this test near existing frequency advisor tests:

```python
def test_advise_all_requires_items_and_constraints(self) -> None:
    invalid_items: list[object] = ["items", [object()]]
    for items in invalid_items:
        with self.subTest(items=items):
            with self.assertRaisesRegex(ValueError, "items"):
                advise_all_frequencies(
                    items,  # type: ignore[arg-type]
                    LaundryConstraints(),
                )

    invalid_constraints: list[object] = [None, object(), {"urgent_item_ids": []}]
    for constraints in invalid_constraints:
        with self.subTest(constraints=constraints):
            with self.assertRaisesRegex(ValueError, "constraints"):
                advise_all_frequencies(
                    [],
                    constraints,  # type: ignore[arg-type]
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_advise_all_requires_items_and_constraints -v`

Expected: FAIL because malformed batch inputs currently reach item-level validation or return silently.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _validate_items(value: object) -> None:
    if not isinstance(value, list):
        raise ValueError("items must be a list")
    for index, item in enumerate(value):
        if not isinstance(item, WardrobeItem):
            raise ValueError(f"items[{index}] must be a WardrobeItem")
```

Call `_validate_items(items)` and `_validate_constraints(constraints)` at the top of `advise_all_frequencies`.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_advise_all_requires_items_and_constraints -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_c_module -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [ ] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-advise-all-inputs.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py
git commit -m "fix: validate batch frequency inputs"
```

Expected: one local commit. Do not push or upload.
