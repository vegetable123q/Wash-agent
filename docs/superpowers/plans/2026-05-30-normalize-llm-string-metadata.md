# LLM String Metadata Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent non-string LLM metadata values from being stringified into plausible but invalid profile data.

**Architecture:** Add small helpers for optional text fields and known string-to-string field-source maps. Use them for LLM `recommended_wash` and `field_sources`, preserving valid strings while ignoring malformed values.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed LLM string metadata

**Files:**
- Modify: `tests/test_clothing_extraction.py`

- [ ] **Step 1: Write the failing test**

Add this test near the other LLM validation tests:

```python
    def test_llm_string_metadata_requires_strings(self) -> None:
        response = {
            "name": "test shirt",
            "material_ratios": {"cotton": 1.0},
            "colors": ["black"],
            "care_forbidden": [],
            "risks": {},
            "confidence": 0.7,
            "recommended_wash": True,
            "field_sources": {
                True: "manual",
                "colors": 123,
                "care_forbidden": " vision_extraction ",
            },
        }

        profile = extract_clothing_info(
            ClothingInput(name="test shirt"),
            llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
        )

        self.assertEqual(profile.recommended_wash, "")
        self.assertEqual(profile.field_sources, {"care_forbidden": "vision_extraction"})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_string_metadata_requires_strings -v
```

Expected: FAIL because current code stringifies booleans and numbers.

### Task 2: Normalize string metadata

**Files:**
- Modify: `backend/clothing_extraction/extractor.py`

- [ ] **Step 1: Add helpers near `_string_list`**

```python
def _optional_string(value: Any) -> str:
    return value.strip() if isinstance(value, str) else ""


def _string_dict(value: Any) -> dict[str, str]:
    items: dict[str, str] = {}
    for key, item_value in _object_dict(value).items():
        if not isinstance(key, str) or not isinstance(item_value, str):
            continue
        normalized_key = key.strip()
        normalized_value = item_value.strip()
        if normalized_key in _FIELD_SOURCE_KEYS and normalized_value:
            items[normalized_key] = normalized_value
    return items
```

- [ ] **Step 2: Use helpers in `_profile_from_llm`**

Replace:

```python
        recommended_wash=str(payload.get("recommended_wash") or ""),
        field_sources={
            str(key): str(value)
            for key, value in _object_dict(payload.get("field_sources")).items()
        },
```

with:

```python
        recommended_wash=_optional_string(payload.get("recommended_wash")),
        field_sources=_string_dict(payload.get("field_sources")),
```

- [ ] **Step 3: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_string_metadata_requires_strings -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/clothing_extraction/extractor.py`
- Modify: `tests/test_clothing_extraction.py`
- Create: `docs/superpowers/plans/2026-05-30-normalize-llm-string-metadata.md`

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
git add docs/superpowers/plans/2026-05-30-normalize-llm-string-metadata.md backend/clothing_extraction/extractor.py tests/test_clothing_extraction.py
git commit -m "fix: normalize llm string metadata"
```

Expected: A local commit is created. Do not push or upload.
