# User Note Fields Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent non-string user note values from overriding valid textual notes during product enrichment.

**Architecture:** Add a small `_first_text` helper that selects the first non-empty string after whitespace normalization. Use it for `user_note`, preserving the existing priority order while skipping malformed values.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed user note values

**Files:**
- Modify: `tests/test_clothing_extraction.py`

- [ ] **Step 1: Write the failing test**

Add this test near the product-info enrichment tests:

```python
    def test_enrich_product_info_ignores_non_string_user_note_overrides(self) -> None:
        raw = ClothingInput(
            name="test shirt",
            user_description=" legacy note ",
            extra={"user_note": True},
        )

        enriched = enrich_product_info(raw)

        self.assertEqual(enriched.user_note, "legacy note")
        self.assertEqual(enriched.user_description, "legacy note")
        self.assertEqual(enriched.extra["user_note"], "legacy note")
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_enrich_product_info_ignores_non_string_user_note_overrides -v
```

Expected: FAIL because current code converts boolean `extra.user_note` into `"True"`.

### Task 2: Add string-only user note selection

**Files:**
- Modify: `backend/clothing_extraction/product_info.py`

- [ ] **Step 1: Add helper near `_normalize_text`**

```python
def _first_text(*values: Any) -> str:
    for value in values:
        if not isinstance(value, str):
            continue
        text = _normalize_text(value)
        if text:
            return text
    return ""
```

- [ ] **Step 2: Use helper for user note**

Replace:

```python
    user_note = _normalize_text(
        str(raw.user_note or raw.extra.get("user_note") or raw.user_description)
    )
```

with:

```python
    user_note = _first_text(
        raw.user_note,
        raw.extra.get("user_note"),
        raw.user_description,
    )
```

- [ ] **Step 3: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_enrich_product_info_ignores_non_string_user_note_overrides -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/clothing_extraction/product_info.py`
- Modify: `tests/test_clothing_extraction.py`
- Create: `docs/superpowers/plans/2026-05-30-normalize-user-note-fields.md`

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
git add docs/superpowers/plans/2026-05-30-normalize-user-note-fields.md backend/clothing_extraction/product_info.py tests/test_clothing_extraction.py
git commit -m "fix: normalize user note fields"
```

Expected: A local commit is created. Do not push or upload.
