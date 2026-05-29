# Validate Frequency Min Score Type Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `recommended_item_ids` reject boolean and non-numeric `min_score` values while preserving the existing behavior that non-finite numeric values default to `0`.

**Architecture:** Keep score normalization local to `backend/wardrobe/frequency_advisor.py`. Add a `_min_score` helper that validates the type, converts numeric values to `float`, and maps `NaN`/infinity to `0.0`.

**Tech Stack:** Python numeric validation, `unittest`, `uv`.

---

### Task 1: Validate min_score type

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [x] **Step 1: Write the failing test**

Add this test near existing `recommended_item_ids` tests:

```python
def test_recommended_item_ids_requires_numeric_min_score(self) -> None:
    items = self.store.list_items()
    invalid_min_scores: list[object] = [True, "45", None]

    for min_score in invalid_min_scores:
        with self.subTest(min_score=min_score):
            with self.assertRaisesRegex(ValueError, "min_score"):
                recommended_item_ids(
                    items,
                    LaundryConstraints(),
                    min_score=min_score,  # type: ignore[arg-type]
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_recommended_item_ids_requires_numeric_min_score -v`

Expected: FAIL because booleans are accepted as numbers and strings leak `TypeError`.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _min_score(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise ValueError("min_score must be numeric")
    score = float(value)
    return score if math.isfinite(score) else 0.0
```

Use `safe_min_score = _min_score(min_score)` in `recommended_item_ids`.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_recommended_item_ids_requires_numeric_min_score -v`

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
git add docs/superpowers/plans/2026-05-30-validate-frequency-min-score-type.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py
git commit -m "fix: validate frequency min score"
```

Expected: one local commit. Do not push or upload.
