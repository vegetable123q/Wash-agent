# Validate Wardrobe Item Shape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wardrobe loading reject non-object entries inside the `items` list with a stable, indexed `ValueError`.

**Architecture:** Keep JSON shape validation in `WardrobeStore._read_items` because that method owns the file payload boundary. Add one regression test in the existing C module suite and return the same list once each item is confirmed to be an object.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject non-object wardrobe items

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing wardrobe store validation tests:

```python
def test_store_rejects_invalid_item_shape(self) -> None:
    invalid_items: list[object] = [True, 123, "item"]
    for item in invalid_items:
        with self.subTest(item=item):
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            payload["items"][0] = item
            self.path.write_text(
                json.dumps(payload, ensure_ascii=False),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, r"items\[0\]"):
                self.store.list_items()
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_item_shape -v`

Expected: FAIL because non-object items currently reach item deserialization and can produce unstable errors.

- [x] **Step 3: Write minimal implementation**

In `_read_items`, validate each list element before returning:

```python
for index, item in enumerate(items):
    if not isinstance(item, dict):
        raise ValueError(f"items[{index}] must be an object")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_item_shape -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_c_module -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-wardrobe-item-shape.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: validate wardrobe item shape"
```

Expected: one local commit. Do not push or upload.
