# Normalize Supplemental Source Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Avoid blank supplemental source labels in normalized clothing source text.

**Architecture:** Update `_iter_supplemental_sources` in `backend/clothing_extraction/product_info.py` so a whitespace-only `source` field falls back to the generated supplemental source label instead of producing lines like `: kept text`.

**Tech Stack:** Python text normalization, `unittest`, `uv`.

---

### Task 1: Fall back for blank supplemental source names

**Files:**
- Modify: `tests/test_clothing_extraction.py`
- Modify: `backend/clothing_extraction/product_info.py`

- [x] **Step 1: Write the failing test**

Add:

```python
def test_enrich_product_info_uses_fallback_for_blank_supplemental_source_name(self) -> None:
    raw = ClothingInput(
        name="",
        extra={
            "supplemental_sources": [
                {"source": "   ", "text": " kept text "},
            ]
        },
    )

    enriched = enrich_product_info(raw)

    matching_lines = [
        line
        for line in enriched.extra["normalized_source_text"].splitlines()
        if "kept text" in line
    ]
    self.assertEqual(len(matching_lines), 1)
    self.assertFalse(matching_lines[0].startswith(":"))
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_enrich_product_info_uses_fallback_for_blank_supplemental_source_name -v`

Expected: FAIL because a blank source name currently produces a line that starts with `:`.

- [x] **Step 3: Write minimal implementation**

Update `_iter_supplemental_sources`:

```python
name = _normalize_text(name_value) if isinstance(name_value, str) else ""
if not name:
    name = f"补充来源{index}"
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_enrich_product_info_uses_fallback_for_blank_supplemental_source_name -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_clothing_extraction -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-normalize-supplemental-source-labels.md tests/test_clothing_extraction.py backend/clothing_extraction/product_info.py
git commit -m "fix: normalize supplemental source labels"
```

Expected: one local commit. Do not push or upload.
