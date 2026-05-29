# Ignore Non-Object LLM Maps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent malformed LLM map fields from crashing clothing extraction.

**Architecture:** Add one local helper that returns a mapping only when the payload value is a real dict. Use it for LLM `material_ratios`, `risks`, and `field_sources`, preserving current behavior for valid objects.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed LLM map payloads

**Files:**
- Modify: `tests/test_clothing_extraction.py`

- [ ] **Step 1: Write the failing test**

Add this test near the other LLM validation tests:

```python
    def test_llm_map_fields_require_objects(self) -> None:
        response = {
            "name": "test shirt",
            "material_ratios": True,
            "colors": ["black"],
            "care_forbidden": [],
            "risks": True,
            "confidence": 0.7,
            "field_sources": True,
        }

        try:
            profile = extract_clothing_info(
                ClothingInput(name="test shirt"),
                llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
            )
        except TypeError as exc:
            self.fail(f"malformed LLM map fields should not crash: {exc}")

        self.assertEqual(profile.material_ratios, {})
        self.assertIn("material_ratios", profile.missing_fields)
        self.assertEqual(profile.risks["shrink"], RiskLevel.UNKNOWN)
        self.assertEqual(profile.field_sources, {})
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_map_fields_require_objects -v
```

Expected: FAIL because current code calls `dict(...)` on non-object payload values.

### Task 2: Add map-field guard

**Files:**
- Modify: `backend/clothing_extraction/extractor.py`

- [ ] **Step 1: Add helper near the other normalization helpers**

```python
def _object_dict(value: Any) -> dict[Any, Any]:
    return value if isinstance(value, dict) else {}
```

- [ ] **Step 2: Use helper for LLM maps**

Replace `dict(payload.get("material_ratios") or {})`, `dict(payload.get("risks") or {})`, and `dict(payload.get("field_sources") or {})` with `_object_dict(...)`.

- [ ] **Step 3: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_map_fields_require_objects -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/clothing_extraction/extractor.py`
- Modify: `tests/test_clothing_extraction.py`
- Create: `docs/superpowers/plans/2026-05-30-ignore-non-object-llm-maps.md`

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
git add docs/superpowers/plans/2026-05-30-ignore-non-object-llm-maps.md backend/clothing_extraction/extractor.py tests/test_clothing_extraction.py
git commit -m "fix: ignore non-object llm maps"
```

Expected: A local commit is created. Do not push or upload.
