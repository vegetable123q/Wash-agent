# Validate Record Wear Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure `WardrobeStore.record_wear` only accepts positive integer increments.

**Architecture:** Keep input validation in `backend/wardrobe/store.py`, at the public storage method boundary. Add a focused test for invalid counts, then reuse the existing integer validation pattern with a positive integer helper.

**Tech Stack:** Python 3, `unittest`, `uv`, existing `WardrobeStore` tests.

---

### Task 1: Validate `record_wear` Count

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [ ] **Step 1: Write the failing test**

Add a test near `test_upsert_record_wear_and_wash_history`:

```python
def test_record_wear_rejects_invalid_count(self) -> None:
    invalid_counts: list[object] = [True, 0, -1, 1.5, "2"]
    for count in invalid_counts:
        with self.subTest(count=count):
            with self.assertRaisesRegex(ValueError, "count"):
                self.store.record_wear("wm-white-tee-001", count=count)  # type: ignore[arg-type]
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_record_wear_rejects_invalid_count -v`

Expected: FAIL because `True` and `1.5` are currently accepted and strings raise `TypeError`.

- [ ] **Step 3: Write the minimal implementation**

Add a positive integer helper:

```python
def _positive_int(value: Any, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{field_name} must be a positive integer")
    if value < 1:
        raise ValueError(f"{field_name} must be a positive integer")
    return value
```

Use it at the start of `record_wear` before mutating the item.

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
git add docs/superpowers/plans/2026-05-30-validate-record-wear-count.md backend/wardrobe/store.py tests/test_c_module.py
git commit -m "fix: validate record wear count"
```
