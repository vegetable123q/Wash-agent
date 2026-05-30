# Normalize Material Ratio Keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent malformed material names from entering extracted clothing profiles.

**Architecture:** Add one `_normalize_material_ratios` helper in `backend/clothing_extraction/extractor.py` and use it for both LLM payloads and `manual_fields`. The helper accepts only non-empty string keys, trims and lowercases them, and reuses existing ratio normalization. Also make `manual_fields` source-text serialization robust to malformed nested keys so validation happens in the extraction boundary instead of crashing during enrichment.

**Tech Stack:** Python normalization helpers, `unittest`, `uv`.

---

### Task 1: Normalize material ratio keys

**Files:**
- Modify: `tests/test_clothing_extraction.py`
- Modify: `backend/clothing_extraction/product_info.py`
- Modify: `backend/clothing_extraction/extractor.py`

- [x] **Step 1: Write the LLM failing test**

Add:

```python
def test_llm_material_ratios_trim_and_ignore_invalid_keys(self) -> None:
    response = {
        "name": "test shirt",
        "material_ratios": {" Cotton ": 0.8, "": 0.2},
        "colors": ["black"],
        "care_forbidden": [],
        "risks": {},
        "confidence": 0.7,
    }

    profile = extract_clothing_info(
        ClothingInput(name="test shirt"),
        llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
    )

    self.assertEqual(profile.material_ratios, {"cotton": 0.8})
```

- [x] **Step 2: Write the manual-fields failing test**

Add:

```python
def test_manual_material_ratios_trim_and_ignore_invalid_keys(self) -> None:
    profile = extract_clothing_info(
        ClothingInput(
            name="sweater",
            extra={
                "manual_fields": {
                    "material_ratios": {True: 50, " Wool ": 70, "": 30},
                    "colors": ["navy"],
                    "care_forbidden": ["hand wash only"],
                }
            },
        ),
        llm_client=BrokenLLMClient(),
    )

    self.assertEqual(profile.material_ratios, {"wool": 0.7})
```

- [x] **Step 3: Run tests to verify they fail**

Run: `uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_material_ratios_trim_and_ignore_invalid_keys tests.test_clothing_extraction.ClothingExtractionTests.test_manual_material_ratios_trim_and_ignore_invalid_keys -v`

Expected: FAIL because invalid material keys are currently preserved or stringified. The manual-fields test may initially ERROR in `product_info.py` because sorted JSON serialization cannot compare mixed key types.

- [x] **Step 4: Write minimal implementation**

Add:

```python
def _normalize_material_ratios(value: Any) -> dict[str, float]:
    ratios: dict[str, float] = {}
    for key, raw_ratio in _object_dict(value).items():
        if not isinstance(key, str):
            continue
        material = key.strip().lower()
        if not material:
            continue
        ratio = _normalize_ratio(raw_ratio)
        if ratio is not None:
            ratios[material] = ratio
    return ratios
```

Use this helper in `_apply_manual_fields` and `_profile_from_llm`.

- [x] **Step 5: Make manual field source serialization key-safe**

In `backend/clothing_extraction/product_info.py`, add:

```python
def _json_safe(value: Any) -> Any:
    if isinstance(value, dict):
        return {str(key): _json_safe(item) for key, item in value.items()}
    if isinstance(value, list):
        return [_json_safe(item) for item in value]
    return value
```

Use it when dumping `manual_fields` into `normalized_source_text`:

```python
json.dumps(_json_safe(manual_fields), ensure_ascii=False, sort_keys=True)
```

- [x] **Step 6: Run target tests to verify they pass**

Run: `uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_material_ratios_trim_and_ignore_invalid_keys tests.test_clothing_extraction.ClothingExtractionTests.test_manual_material_ratios_trim_and_ignore_invalid_keys -v`

Expected: PASS.

- [x] **Step 7: Run focused module tests**

Run: `uv run python -m unittest tests.test_clothing_extraction -v`

Expected: PASS.

- [x] **Step 8: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 9: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-normalize-material-ratio-keys.md tests/test_clothing_extraction.py backend/clothing_extraction/product_info.py backend/clothing_extraction/extractor.py
git commit -m "fix: normalize material ratio keys"
```

Expected: one local commit. Do not push or upload.
