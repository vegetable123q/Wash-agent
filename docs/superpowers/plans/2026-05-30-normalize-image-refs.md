# Image Refs Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent malformed `image_refs` values from crashing product enrichment or reaching the LLM image path flow.

**Architecture:** Reuse the local `_string_list` helper in `product_info.py` to normalize image references once during enrichment. Use the normalized list for source text and return it in the enriched `ClothingInput`.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed image refs

**Files:**
- Modify: `tests/test_clothing_extraction.py`

- [ ] **Step 1: Write the failing test**

Add this test near the product-info enrichment tests:

```python
    def test_enrich_product_info_normalizes_image_refs(self) -> None:
        raw = ClothingInput(
            name="",
            image_refs=[" uploads/tag.png ", True, "", 123],
        )

        try:
            enriched = enrich_product_info(raw)
        except TypeError as exc:
            self.fail(f"malformed image refs should not crash: {exc}")

        self.assertEqual(enriched.image_refs, ["uploads/tag.png"])
        self.assertIn("uploads/tag.png", enriched.extra["normalized_source_text"])
        self.assertNotIn("True", enriched.extra["normalized_source_text"])
        self.assertNotIn("123", enriched.extra["normalized_source_text"])
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_enrich_product_info_normalizes_image_refs -v
```

Expected: FAIL because current code calls `join` on malformed image refs.

### Task 2: Normalize image refs in enrichment

**Files:**
- Modify: `backend/clothing_extraction/product_info.py`

- [ ] **Step 1: Normalize image refs after `extra` is copied**

```python
    image_refs = _string_list(raw.image_refs)
```

- [ ] **Step 2: Use normalized image refs in source text**

Replace:

```python
    if raw.image_refs:
        source_parts.append("图片引用: " + ", ".join(raw.image_refs))
```

with:

```python
    if image_refs:
        source_parts.append("图片引用: " + ", ".join(image_refs))
```

- [ ] **Step 3: Return normalized image refs**

Add `image_refs=image_refs` to the `replace(...)` call.

- [ ] **Step 4: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_enrich_product_info_normalizes_image_refs -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/clothing_extraction/product_info.py`
- Modify: `tests/test_clothing_extraction.py`
- Create: `docs/superpowers/plans/2026-05-30-normalize-image-refs.md`

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
git add docs/superpowers/plans/2026-05-30-normalize-image-refs.md backend/clothing_extraction/product_info.py tests/test_clothing_extraction.py
git commit -m "fix: normalize image refs"
```

Expected: A local commit is created. Do not push or upload.
