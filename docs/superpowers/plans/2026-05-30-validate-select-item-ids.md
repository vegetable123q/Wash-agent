# Validate Select Item IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `WardrobeStore.select_items` reject malformed `item_ids` inputs before treating characters or non-string values as missing wardrobe IDs.

**Architecture:** Add a small list validator in `backend/wardrobe/store.py` and call it at the start of `select_items`. Keep selection ordering and existing missing-ID behavior unchanged for valid string IDs.

**Tech Stack:** Python JSON storage, `unittest`, `uv`.

---

### Task 1: Validate select_items item IDs

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add this test near existing `select_items` coverage:

```python
def test_select_items_requires_string_item_ids(self) -> None:
    invalid_item_ids: list[object] = ["wm-white-tee-001", [True], [123], [""]]
    for item_ids in invalid_item_ids:
        with self.subTest(item_ids=item_ids):
            with self.assertRaisesRegex(ValueError, "item_ids"):
                self.store.select_items(item_ids)  # type: ignore[arg-type]
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_select_items_requires_string_item_ids -v`

Expected: FAIL because malformed `item_ids` currently reach missing-ID handling or dictionary lookup.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _item_id_list(value: Any, field_name: str) -> list[str]:
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list of non-empty strings")
    if not all(isinstance(item, str) and item.strip() for item in value):
        raise ValueError(f"{field_name} must be a list of non-empty strings")
    return [item.strip() for item in value]
```

Call `item_ids = _item_id_list(item_ids, "item_ids")` at the start of `select_items`.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_select_items_requires_string_item_ids -v`

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
git add docs/superpowers/plans/2026-05-30-validate-select-item-ids.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: validate selected item ids"
```

Expected: one local commit. Do not push or upload.
