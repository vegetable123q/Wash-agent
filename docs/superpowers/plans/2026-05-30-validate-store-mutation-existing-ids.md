# Validate Store Mutation Existing IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wardrobe mutation paths reject malformed existing records with explicit `ValueError` messages instead of leaking `KeyError` from raw dictionary access.

**Architecture:** Keep `WardrobeStore._read_items` as the raw JSON boundary. Add a focused helper that extracts and validates `items[index].profile.item_id`, then use it in `upsert_item` and `delete_item`.

**Tech Stack:** Python JSON storage, `unittest`, `uv`.

---

### Task 1: Validate existing item IDs during mutations

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add this test near existing store mutation tests:

```python
def test_store_mutations_reject_malformed_existing_item_ids(self) -> None:
    new_item = WardrobeItem(
        profile=ClothingProfile(
            item_id="new-item",
            name="new item",
            material_ratios={"cotton": 1.0},
        )
    )

    for operation in ("upsert", "delete"):
        with self.subTest(operation=operation):
            self.path.write_text(
                json.dumps({"items": [{"profile": {"name": "broken"}}]}),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "item_id"):
                if operation == "upsert":
                    self.store.upsert_item(new_item)
                else:
                    self.store.delete_item("missing-item")
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_mutations_reject_malformed_existing_item_ids -v`

Expected: FAIL because mutations currently access `existing["profile"]["item_id"]` directly.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _stored_item_id(data: dict[str, Any], index: int) -> str:
    profile = data.get("profile")
    if not isinstance(profile, dict):
        raise ValueError(f"items[{index}].profile must be an object")
    if "item_id" not in profile:
        raise ValueError(f"items[{index}].profile missing required fields: item_id")
    return _required_text(profile["item_id"], f"items[{index}].profile.item_id")
```

Use it in `upsert_item` and `delete_item` when comparing existing records.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_mutations_reject_malformed_existing_item_ids -v`

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
git add docs/superpowers/plans/2026-05-30-validate-store-mutation-existing-ids.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: validate store mutation item ids"
```

Expected: one local commit. Do not push or upload.
