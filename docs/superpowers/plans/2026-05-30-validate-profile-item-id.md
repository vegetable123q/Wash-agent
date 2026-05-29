# Validate Profile Item Id Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent stored wardrobe profile `item_id` values from being empty or non-string identifiers.

**Architecture:** Keep validation in `backend/wardrobe/store.py`, where persisted wardrobe JSON is converted into shared dataclasses. Add a focused regression test, then normalize `profile.item_id` through the existing non-empty text helper.

**Tech Stack:** Python 3, `unittest`, `uv`, existing `WardrobeStore` tests.

---

### Task 1: Validate Stored Profile Item IDs

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [ ] **Step 1: Write the failing test**

Add a test near the existing store validation tests:

```python
def test_store_rejects_invalid_profile_item_id(self) -> None:
    invalid_item_ids: list[object] = [True, 123, ""]
    for item_id in invalid_item_ids:
        with self.subTest(item_id=item_id):
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            payload["items"][0]["profile"]["item_id"] = item_id
            self.path.write_text(
                json.dumps(payload, ensure_ascii=False),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "item_id"):
                self.store.list_items()
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_item_id -v`

Expected: FAIL because current profile loading only checks that `item_id` exists.

- [ ] **Step 3: Write the minimal implementation**

Update `_profile_from_dict` after `cleaned = dict(data)`:

```python
cleaned["item_id"] = _required_text(cleaned["item_id"], "item_id")
```

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `uv run python -m unittest tests.test_c_module -v`

Expected: all C module tests pass.

- [ ] **Step 5: Run full backend verification**

Run: `uv run python -m unittest discover -v`

Expected: all backend tests pass.

- [ ] **Step 6: Run whitespace check**

Run: `git diff --check`

Expected: exit code 0, ignoring harmless CRLF warnings if present.

- [ ] **Step 7: Commit local-only version**

```bash
git add docs/superpowers/plans/2026-05-30-validate-profile-item-id.md backend/wardrobe/store.py tests/test_c_module.py
git commit -m "fix: validate wardrobe profile item ids"
```
