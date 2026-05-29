# Ignore Invalid Material Ratios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent LLM or manual material ratios from accepting booleans, NaN, or infinite values as usable fabric composition.

**Architecture:** The extractor already funnels material ratio values through `_normalize_ratio` in `backend/clothing_extraction/extractor.py`. Add one regression test through `extract_clothing_info`, then reject booleans and non-finite numbers in that helper.

**Tech Stack:** Python 3, `unittest`, `uv`, existing clothing extraction tests.

---

### Task 1: Ignore Invalid Material Ratio Values

**Files:**
- Modify: `tests/test_clothing_extraction.py`
- Modify: `backend/clothing_extraction/extractor.py`

- [ ] **Step 1: Write the failing test**

Add a test near other LLM material ratio tests:

```python
def test_llm_material_ratios_ignore_boolean_and_nonfinite_values(self) -> None:
    response = {
        "name": "test shirt",
        "material_ratios": {"cotton": True, "wool": float("nan"), "nylon": float("inf")},
        "colors": ["black"],
        "care_forbidden": [],
        "risks": {},
        "confidence": 0.7,
    }

    profile = extract_clothing_info(
        ClothingInput(name="test shirt"),
        llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
    )

    self.assertEqual(profile.material_ratios, {})
    self.assertIn("material_ratios", profile.missing_fields)
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_material_ratios_ignore_boolean_and_nonfinite_values -v`

Expected: FAIL because current `_normalize_ratio` accepts `True` as `1.0`.

- [ ] **Step 3: Write the minimal implementation**

Import `math` and update `_normalize_ratio`:

```python
if isinstance(value, bool):
    return None
...
if not math.isfinite(ratio):
    return None
```

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `uv run python -m unittest tests.test_clothing_extraction -v`

Expected: all clothing extraction tests pass.

- [ ] **Step 5: Run full backend verification**

Run: `uv run python -m unittest discover -v`

Expected: all backend tests pass.

- [ ] **Step 6: Run whitespace check**

Run: `git diff --check`

Expected: exit code 0, ignoring harmless CRLF warnings if present.

- [ ] **Step 7: Commit local-only version**

```bash
git add docs/superpowers/plans/2026-05-30-ignore-invalid-material-ratios.md backend/clothing_extraction/extractor.py tests/test_clothing_extraction.py
git commit -m "fix: ignore invalid material ratios"
```
