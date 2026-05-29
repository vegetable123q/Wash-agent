# Supplemental Sources Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent malformed `extra.supplemental_sources` values from becoming fake product context.

**Architecture:** Tighten `_iter_supplemental_sources` so it only iterates list-shaped values. Within the list, accept strings and dicts with string `text`; ignore booleans, numbers, and dicts whose text is not a string.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed supplemental sources

**Files:**
- Modify: `tests/test_clothing_extraction.py`

- [ ] **Step 1: Write the failing test**

Add this test near the product-info enrichment tests:

```python
    def test_enrich_product_info_ignores_malformed_supplemental_sources(self) -> None:
        raw = ClothingInput(
            name="",
            extra={
                "supplemental_sources": [
                    True,
                    {"source": 123, "text": True},
                    {"source": " manual ", "text": " kept text "},
                    " loose text ",
                ]
            },
        )

        enriched = enrich_product_info(raw)
        source_text = enriched.extra["normalized_source_text"]

        self.assertIn("kept text", source_text)
        self.assertIn("loose text", source_text)
        self.assertNotIn("True", source_text)
        self.assertNotIn("123", source_text)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_enrich_product_info_ignores_malformed_supplemental_sources -v
```

Expected: FAIL because current code stringifies malformed supplemental sources.

### Task 2: Tighten supplemental source parsing

**Files:**
- Modify: `backend/clothing_extraction/product_info.py`

- [ ] **Step 1: Guard list shape**

Inside `_iter_supplemental_sources`, assign:

```python
    supplemental_sources = extra.get("supplemental_sources") or []
    if not isinstance(supplemental_sources, list):
        return parts
```

- [ ] **Step 2: Guard item shapes**

Iterate `supplemental_sources`; for dict items, require `text` to be a string. For non-dict items, require the item to be a string before formatting it.

- [ ] **Step 3: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_enrich_product_info_ignores_malformed_supplemental_sources -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/clothing_extraction/product_info.py`
- Modify: `tests/test_clothing_extraction.py`
- Create: `docs/superpowers/plans/2026-05-30-normalize-supplemental-sources.md`

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
git add docs/superpowers/plans/2026-05-30-normalize-supplemental-sources.md backend/clothing_extraction/product_info.py tests/test_clothing_extraction.py
git commit -m "fix: normalize supplemental sources"
```

Expected: A local commit is created. Do not push or upload.
