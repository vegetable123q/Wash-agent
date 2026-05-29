# Extra Text Fields Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent non-string extra text fields from becoming fake OCR or product-page context.

**Architecture:** Make `_format_source` ignore non-string values and pass raw extra values into it. Valid string fields continue to be normalized and included.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed extra text fields

**Files:**
- Modify: `tests/test_clothing_extraction.py`

- [ ] **Step 1: Write the failing test**

Add this test near the product-info enrichment tests:

```python
    def test_enrich_product_info_ignores_non_string_extra_text_fields(self) -> None:
        raw = ClothingInput(
            name="",
            extra={
                "ocr_text": True,
                "product_page_text": 123,
                "taobao_text": " kept product text ",
            },
        )

        enriched = enrich_product_info(raw)
        source_text = enriched.extra["normalized_source_text"]

        self.assertIn("kept product text", source_text)
        self.assertNotIn("True", source_text)
        self.assertNotIn("123", source_text)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_enrich_product_info_ignores_non_string_extra_text_fields -v
```

Expected: FAIL because current code stringifies non-string extra text values.

### Task 2: Guard extra text field types

**Files:**
- Modify: `backend/clothing_extraction/product_info.py`

- [ ] **Step 1: Update `_format_source`**

```python
def _format_source(label: str, value: Any) -> str:
    if not isinstance(value, str):
        return ""
    text = _normalize_text(value)
    return f"{label}: {text}" if text else ""
```

- [ ] **Step 2: Remove stringification at call sites**

Replace:

```python
        formatted = _format_source(label, str(extra.get(key, "")))
```

with:

```python
        formatted = _format_source(label, extra.get(key))
```

- [ ] **Step 3: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_enrich_product_info_ignores_non_string_extra_text_fields -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/clothing_extraction/product_info.py`
- Modify: `tests/test_clothing_extraction.py`
- Create: `docs/superpowers/plans/2026-05-30-normalize-extra-text-fields.md`

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
git add docs/superpowers/plans/2026-05-30-normalize-extra-text-fields.md backend/clothing_extraction/product_info.py tests/test_clothing_extraction.py
git commit -m "fix: normalize extra text fields"
```

Expected: A local commit is created. Do not push or upload.
