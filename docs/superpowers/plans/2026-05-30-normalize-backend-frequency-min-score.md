# Normalize Backend Frequency Min Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Align backend frequency recommendations with the frontend by treating non-finite `min_score` as `0` instead of returning no recommendations.

**Architecture:** Keep the normalization local to `recommended_item_ids` in `backend/wardrobe/frequency_advisor.py`. Add a regression test using `float("nan")`, then normalize the threshold before filtering advice.

**Tech Stack:** Python 3, `unittest`, `uv`, existing C module frequency tests.

---

### Task 1: Normalize Non-Finite Recommendation Thresholds

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [ ] **Step 1: Write the failing test**

Add a test near `test_recommended_item_ids_uses_explicit_score_threshold`:

```python
def test_recommended_item_ids_defaults_nonfinite_threshold_to_zero(self) -> None:
    items = self.store.list_items()

    ids = recommended_item_ids(items, LaundryConstraints(), min_score=float("nan"))

    self.assertIn("wm-white-tee-001", ids)
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_recommended_item_ids_defaults_nonfinite_threshold_to_zero -v`

Expected: FAIL because Python comparisons against `nan` currently filter out every item.

- [ ] **Step 3: Write the minimal implementation**

Import `math` and update `recommended_item_ids`:

```python
safe_min_score = min_score if math.isfinite(min_score) else 0.0
```

Use `safe_min_score` in the filter.

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
git add docs/superpowers/plans/2026-05-30-normalize-backend-frequency-min-score.md backend/wardrobe/frequency_advisor.py tests/test_c_module.py
git commit -m "fix: normalize backend frequency min score"
```
