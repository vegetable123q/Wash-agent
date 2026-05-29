# Validate Wardrobe User Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent stored wardrobe `user_notes` from being silently converted from strings or mixed-type lists.

**Architecture:** Keep JSON shape validation inside `backend/wardrobe/store.py`. Add a regression test that mutates persisted wardrobe data, then replace `list(...)` coercion for `user_notes` with a helper that requires a list of strings.

**Tech Stack:** Python 3, `unittest`, `uv`, existing `WardrobeStore` tests.

---

### Task 1: Validate Stored User Notes

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [ ] **Step 1: Write the failing test**

Add a test near the existing store validation tests:

```python
def test_store_rejects_invalid_user_notes(self) -> None:
    invalid_notes: list[object] = ["note", [True], [123]]
    for notes in invalid_notes:
        with self.subTest(notes=notes):
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            payload["items"][0]["user_notes"] = notes
            self.path.write_text(
                json.dumps(payload, ensure_ascii=False),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "user_notes"):
                self.store.list_items()
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_user_notes -v`

Expected: FAIL because current code coerces strings and mixed lists with `list(...)`.

- [ ] **Step 3: Write the minimal implementation**

Add a helper:

```python
def _string_list(value: Any, field_name: str) -> list[str]:
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list of strings")
    if not all(isinstance(item, str) for item in value):
        raise ValueError(f"{field_name} must be a list of strings")
    return list(value)
```

Use it for `user_notes` in `_wardrobe_item_from_dict`.

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
git add docs/superpowers/plans/2026-05-30-validate-wardrobe-user-notes.md backend/wardrobe/store.py tests/test_c_module.py
git commit -m "fix: validate wardrobe user notes"
```
