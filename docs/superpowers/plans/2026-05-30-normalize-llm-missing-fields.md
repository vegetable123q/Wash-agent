# LLM Missing Fields Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent malformed LLM `missing_fields` values from polluting profile metadata.

**Architecture:** Reuse the existing strict `_string_list` helper for `missing_fields`, so only list-shaped string entries survive and whitespace is trimmed before `_with_missing_fields` merges them with computed missing fields.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed LLM missing fields

**Files:**
- Modify: `tests/test_clothing_extraction.py`

- [ ] **Step 1: Write the failing test**

Add this test near the other LLM validation tests:

```python
    def test_llm_missing_fields_require_string_items(self) -> None:
        response = {
            "name": "test shirt",
            "material_ratios": {"cotton": 1.0},
            "colors": ["black"],
            "care_forbidden": [],
            "risks": {},
            "confidence": 0.7,
            "missing_fields": [True, 123, " care_forbidden "],
        }

        profile = extract_clothing_info(
            ClothingInput(name="test shirt"),
            llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
        )

        self.assertEqual(profile.missing_fields, ["care_forbidden"])
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_missing_fields_require_string_items -v
```

Expected: FAIL because current code stringifies non-string values and keeps untrimmed field names.

### Task 2: Reuse strict string-list normalization

**Files:**
- Modify: `backend/clothing_extraction/extractor.py`

- [ ] **Step 1: Route `missing_fields` through `_string_list`**

Replace:

```python
    llm_missing = [str(field) for field in payload.get("missing_fields") or []]
```

with:

```python
    llm_missing = _string_list(payload.get("missing_fields"))
```

- [ ] **Step 2: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_missing_fields_require_string_items -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/clothing_extraction/extractor.py`
- Modify: `tests/test_clothing_extraction.py`
- Create: `docs/superpowers/plans/2026-05-30-normalize-llm-missing-fields.md`

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
git add docs/superpowers/plans/2026-05-30-normalize-llm-missing-fields.md backend/clothing_extraction/extractor.py tests/test_clothing_extraction.py
git commit -m "fix: normalize llm missing fields"
```

Expected: A local commit is created. Do not push or upload.
