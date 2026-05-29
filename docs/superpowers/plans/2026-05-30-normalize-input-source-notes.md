# Input Source Notes Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent malformed user-provided `extra.source_notes` values from entering enriched clothing input.

**Architecture:** Add a small local string-list normalizer in `product_info.py` and use it when initializing source notes. This keeps valid notes while dropping non-string and empty entries before generated source notes are appended.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed input source notes

**Files:**
- Modify: `tests/test_clothing_extraction.py`

- [ ] **Step 1: Write the failing test**

Add this test near `test_enrich_product_info_normalizes_source_text`:

```python
    def test_enrich_product_info_normalizes_extra_source_notes(self) -> None:
        raw = ClothingInput(
            name="",
            extra={"source_notes": [" kept note ", True, "", 123]},
        )

        enriched = enrich_product_info(raw)

        self.assertEqual(enriched.extra["source_notes"], ["kept note"])
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_enrich_product_info_normalizes_extra_source_notes -v
```

Expected: FAIL because current code preserves non-string and untrimmed entries.

### Task 2: Normalize source notes in product info

**Files:**
- Modify: `backend/clothing_extraction/product_info.py`

- [ ] **Step 1: Add helper near `_normalize_text`**

```python
def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for item in value:
        if not isinstance(item, str):
            continue
        text = _normalize_text(item)
        if text:
            items.append(text)
    return items
```

- [ ] **Step 2: Use helper for source notes**

Replace:

```python
    source_notes = list(raw.extra.get("source_notes", []))
```

with:

```python
    source_notes = _string_list(raw.extra.get("source_notes", []))
```

- [ ] **Step 3: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_enrich_product_info_normalizes_extra_source_notes -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/clothing_extraction/product_info.py`
- Modify: `tests/test_clothing_extraction.py`
- Create: `docs/superpowers/plans/2026-05-30-normalize-input-source-notes.md`

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
git add docs/superpowers/plans/2026-05-30-normalize-input-source-notes.md backend/clothing_extraction/product_info.py tests/test_clothing_extraction.py
git commit -m "fix: normalize input source notes"
```

Expected: A local commit is created. Do not push or upload.
