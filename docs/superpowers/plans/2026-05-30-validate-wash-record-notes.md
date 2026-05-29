# Validate Wash Record Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent stored wash record `notes` from being silently coerced from booleans or numbers.

**Architecture:** Keep storage validation in `backend/wardrobe/store.py`. Add a regression test for invalid note types, then replace `str(...)` coercion with a helper that requires strings while still allowing empty notes.

**Tech Stack:** Python 3, `unittest`, `uv`, existing `WardrobeStore` tests.

---

### Task 1: Validate Stored Wash Record Notes

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [ ] **Step 1: Write the failing test**

Add a test near the wash record validation tests:

```python
def test_store_rejects_invalid_wash_record_notes(self) -> None:
    invalid_notes: list[object] = [True, 123]
    for notes in invalid_notes:
        with self.subTest(notes=notes):
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            payload["items"][2]["wash_history"][0]["notes"] = notes
            self.path.write_text(
                json.dumps(payload, ensure_ascii=False),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "notes"):
                self.store.list_items()
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_wash_record_notes -v`

Expected: FAIL because current code coerces invalid notes with `str(...)`.

- [ ] **Step 3: Write the minimal implementation**

Add a helper:

```python
def _text(value: Any, field_name: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")
    return value
```

Use it for `notes` in `_wash_record_from_dict`.

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
git add docs/superpowers/plans/2026-05-30-validate-wash-record-notes.md backend/wardrobe/store.py tests/test_c_module.py
git commit -m "fix: validate wash record notes"
```
