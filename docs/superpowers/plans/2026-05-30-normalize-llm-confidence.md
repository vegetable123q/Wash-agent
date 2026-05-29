# LLM Confidence Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent boolean and non-finite LLM confidence values from leaking into clothing profiles.

**Architecture:** Keep validation local to the clothing extraction module. Add a small confidence normalizer near the existing ratio normalizer, then route LLM confidence through it before constructing `ClothingProfile`.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover invalid LLM confidence values

**Files:**
- Modify: `tests/test_clothing_extraction.py`

- [ ] **Step 1: Write the failing test**

Add this test near the material-ratio validation tests:

```python
    def test_llm_confidence_ignores_boolean_and_nonfinite_values(self) -> None:
        for invalid_confidence in (True, float("nan"), float("inf")):
            with self.subTest(invalid_confidence=invalid_confidence):
                response = {
                    "name": "test shirt",
                    "material_ratios": {"cotton": 1.0},
                    "colors": ["black"],
                    "care_forbidden": [],
                    "risks": {},
                    "confidence": invalid_confidence,
                }

                profile = extract_clothing_info(
                    ClothingInput(name="test shirt"),
                    llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
                )

                self.assertEqual(profile.confidence, 0.0)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_confidence_ignores_boolean_and_nonfinite_values -v
```

Expected: FAIL because `True` currently becomes `1.0`, and non-finite values may pass through or clamp incorrectly.

### Task 2: Normalize confidence centrally

**Files:**
- Modify: `backend/clothing_extraction/extractor.py`

- [ ] **Step 1: Add a helper beside `_normalize_ratio`**

```python
def _normalize_confidence(value: Any) -> float:
    if isinstance(value, bool):
        return 0.0
    try:
        confidence = float(value)
    except (TypeError, ValueError):
        return 0.0
    if not math.isfinite(confidence):
        return 0.0
    return max(0.0, min(confidence, 1.0))
```

- [ ] **Step 2: Use the helper in `_profile_from_llm`**

Replace the local `try`/`except` confidence parsing and final clamp with:

```python
    confidence = _normalize_confidence(payload.get("confidence", 0.0))
```

and pass `confidence=confidence` into `ClothingProfile`.

- [ ] **Step 3: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_confidence_ignores_boolean_and_nonfinite_values -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/clothing_extraction/extractor.py`
- Modify: `tests/test_clothing_extraction.py`
- Create: `docs/superpowers/plans/2026-05-30-normalize-llm-confidence.md`

- [ ] **Step 1: Run focused clothing extraction tests**

```bash
uv run python -m unittest tests.test_clothing_extraction -v
```

Expected: PASS.

- [ ] **Step 2: Run full backend test suite**

```bash
uv run python -m unittest discover -v
```

Expected: PASS.

- [ ] **Step 3: Check patch formatting**

```bash
git diff --check
```

Expected: exit code 0. CRLF warnings are acceptable on Windows.

- [ ] **Step 4: Commit locally only**

```bash
git add docs/superpowers/plans/2026-05-30-normalize-llm-confidence.md backend/clothing_extraction/extractor.py tests/test_clothing_extraction.py
git commit -m "fix: normalize llm confidence"
```

Expected: A local commit is created. Do not push or upload.
