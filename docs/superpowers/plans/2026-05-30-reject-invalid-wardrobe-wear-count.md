# Reject Invalid Wardrobe Wear Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent stored wardrobe wear counts from being silently coerced from booleans, floats, negative values, or strings.

**Architecture:** Keep validation inside `backend/wardrobe/store.py`, the storage boundary for persisted wardrobe JSON. Add one regression test that mutates the sample wardrobe file, then replace `int(...)` coercion with an explicit non-negative integer parser.

**Tech Stack:** Python 3, `unittest`, `uv`, existing `WardrobeStore` persistence tests.

---

### Task 1: Validate Stored Wear Counts

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [ ] **Step 1: Write the failing test**

Add `json` import and a test near the existing store validation tests:

```python
def test_store_rejects_invalid_wear_count(self) -> None:
    invalid_counts: list[object] = [True, -1, 1.5, "2"]
    for count in invalid_counts:
        with self.subTest(count=count):
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            payload["items"][0]["wear_count_since_wash"] = count
            self.path.write_text(
                json.dumps(payload, ensure_ascii=False),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "wear_count_since_wash"):
                self.store.list_items()
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_wear_count -v`

Expected: FAIL because current code coerces those values through `int(...)`.

- [ ] **Step 3: Write the minimal implementation**

Add a helper:

```python
def _non_negative_int(value: Any, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{field_name} must be a non-negative integer")
    if value < 0:
        raise ValueError(f"{field_name} must be a non-negative integer")
    return value
```

Use it in `_wardrobe_item_from_dict` for `wear_count_since_wash`.

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
git add docs/superpowers/plans/2026-05-30-reject-invalid-wardrobe-wear-count.md backend/wardrobe/store.py tests/test_c_module.py
git commit -m "fix: reject invalid wardrobe wear counts"
```
