# Wrap Wardrobe Invalid JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return a clear wardrobe-store error when the wardrobe JSON file is malformed.

**Architecture:** Catch `json.JSONDecodeError` inside `WardrobeStore._read_items()` and re-raise `ValueError` with the wardrobe path and the original parse message. This mirrors the clearer JSON error handling used in other backend adapters.

**Tech Stack:** Python JSON boundary handling, `unittest`, `uv`.

---

### Task 1: Wrap malformed wardrobe JSON

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add:

```python
def test_store_wraps_invalid_json_errors(self) -> None:
    self.path.write_text("{bad json", encoding="utf-8")

    with self.assertRaisesRegex(ValueError, "Invalid JSON in wardrobe data file"):
        self.store.list_items()
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_wraps_invalid_json_errors -v`

Expected: FAIL because the raw JSON parser error is currently exposed.

- [x] **Step 3: Write minimal implementation**

Wrap `json.load(file)`:

```python
try:
    payload = json.load(file)
except json.JSONDecodeError as exc:
    raise ValueError(f"Invalid JSON in wardrobe data file {self.path}: {exc}") from exc
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_wraps_invalid_json_errors -v`

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
git add docs/superpowers/plans/2026-05-30-wrap-wardrobe-invalid-json.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: wrap wardrobe invalid json"
```

Expected: one local commit. Do not push or upload.
