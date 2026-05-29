# Validate Get Item ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `WardrobeStore.get_item` reject malformed target IDs before returning `None` or letting indirect mutation methods misclassify bad input as missing data.

**Architecture:** Use the existing `_required_text` helper at the start of `get_item`. Keep current `None` behavior unchanged for valid but absent IDs.

**Tech Stack:** Python JSON storage, `unittest`, `uv`.

---

### Task 1: Validate get_item target ID

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add this test near existing store lookup coverage:

```python
def test_get_item_requires_string_item_id(self) -> None:
    invalid_item_ids: list[object] = [True, 123, "", " "]
    for item_id in invalid_item_ids:
        with self.subTest(item_id=item_id):
            with self.assertRaisesRegex(ValueError, "item_id"):
                self.store.get_item(item_id)  # type: ignore[arg-type]
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_get_item_requires_string_item_id -v`

Expected: FAIL because malformed `item_id` currently returns `None` instead of an input error.

- [x] **Step 3: Write minimal implementation**

At the start of `get_item`, add:

```python
item_id = _required_text(item_id, "item_id")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_get_item_requires_string_item_id -v`

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
git add docs/superpowers/plans/2026-05-30-validate-get-item-id.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: validate get item id"
```

Expected: one local commit. Do not push or upload.
