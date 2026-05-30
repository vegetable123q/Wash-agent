# Reject Duplicate Wardrobe Item IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate wardrobe `profile.item_id` values from entering store operations.

**Architecture:** Add a duplicate-id check in `WardrobeStore._read_items()` after each raw item is confirmed to be an object. Reuse `_stored_item_id()` so malformed profile/item id errors keep the existing messages.

**Tech Stack:** Python JSON boundary validation, `unittest`, `uv`.

---

### Task 1: Reject duplicate item ids while reading wardrobe data

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add:

```python
def test_store_rejects_duplicate_profile_item_ids(self) -> None:
    payload = json.loads(self.path.read_text(encoding="utf-8"))
    payload["items"][1]["profile"]["item_id"] = payload["items"][0]["profile"]["item_id"]
    self.path.write_text(json.dumps(payload, ensure_ascii=False), encoding="utf-8")

    with self.assertRaisesRegex(ValueError, "duplicate.*item_id"):
        self.store.list_items()
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_duplicate_profile_item_ids -v`

Expected: FAIL because duplicate ids are currently accepted.

- [x] **Step 3: Write minimal implementation**

In `_read_items()`:

```python
seen_item_ids: set[str] = set()
for index, item in enumerate(items):
    if not isinstance(item, dict):
        raise ValueError(f"items[{index}] must be an object")
    item_id = _stored_item_id(item, index)
    if item_id in seen_item_ids:
        raise ValueError(f"duplicate wardrobe item_id: {item_id}")
    seen_item_ids.add(item_id)
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_duplicate_profile_item_ids -v`

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
git add docs/superpowers/plans/2026-05-30-reject-duplicate-wardrobe-item-ids.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: reject duplicate wardrobe item ids"
```

Expected: one local commit. Do not push or upload.
