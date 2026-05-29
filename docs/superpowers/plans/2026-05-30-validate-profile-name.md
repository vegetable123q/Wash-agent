# Validate Profile Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent stored wardrobe profile names from being empty or non-string values.

**Architecture:** Keep profile validation at the wardrobe storage boundary in `backend/wardrobe/store.py`. Add a focused regression test, then normalize `profile.name` through the existing non-empty text helper.

**Tech Stack:** Python 3, `unittest`, `uv`, existing `WardrobeStore` tests.

---

### Task 1: Validate Stored Profile Names

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [ ] **Step 1: Write the failing test**

Add a test near `test_store_rejects_invalid_profile_item_id`:

```python
def test_store_rejects_invalid_profile_name(self) -> None:
    invalid_names: list[object] = [True, 123, ""]
    for name in invalid_names:
        with self.subTest(name=name):
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            payload["items"][0]["profile"]["name"] = name
            self.path.write_text(
                json.dumps(payload, ensure_ascii=False),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "name"):
                self.store.list_items()
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_name -v`

Expected: FAIL because current profile loading only checks that `name` exists.

- [ ] **Step 3: Write the minimal implementation**

Update `_profile_from_dict` after item ID normalization:

```python
cleaned["name"] = _required_text(cleaned["name"], "name")
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
git add docs/superpowers/plans/2026-05-30-validate-profile-name.md backend/wardrobe/store.py tests/test_c_module.py
git commit -m "fix: validate wardrobe profile names"
```
