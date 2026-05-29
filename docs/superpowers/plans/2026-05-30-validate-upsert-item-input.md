# Validate Upsert Item Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `WardrobeStore.upsert_item` reject malformed incoming objects before writing invalid wardrobe records to disk.

**Architecture:** Keep `upsert_item` as the mutation boundary. Add a helper that requires a `WardrobeItem`, serializes it with the existing `_to_jsonable`, then reuses `_wardrobe_item_from_dict` to validate the serialized shape before writing.

**Tech Stack:** Python dataclasses, JSON storage, `unittest`, `uv`.

---

### Task 1: Validate incoming upsert item

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add this test near existing store mutation tests:

```python
def test_upsert_rejects_invalid_item_input(self) -> None:
    invalid_items: list[object] = [
        object(),
        "item",
        WardrobeItem(profile="profile"),  # type: ignore[arg-type]
    ]

    for item in invalid_items:
        with self.subTest(item=item):
            with self.assertRaisesRegex(ValueError, "item|profile"):
                self.store.upsert_item(item)  # type: ignore[arg-type]
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_upsert_rejects_invalid_item_input -v`

Expected: FAIL because invalid `upsert_item` inputs currently leak attribute errors or can serialize malformed data.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _validated_item_dict(value: Any) -> dict[str, Any]:
    if not isinstance(value, WardrobeItem):
        raise ValueError("item must be a WardrobeItem")
    item_dict = _to_jsonable(value)
    if not isinstance(item_dict, dict):
        raise ValueError("item must serialize to an object")
    _wardrobe_item_from_dict(item_dict)
    return item_dict
```

Use it at the top of `upsert_item`, and compare existing records against `item_dict["profile"]["item_id"]`.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_upsert_rejects_invalid_item_input -v`

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
git add docs/superpowers/plans/2026-05-30-validate-upsert-item-input.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: validate upsert item input"
```

Expected: one local commit. Do not push or upload.
