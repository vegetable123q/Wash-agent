# Backend Extractor Filter Zero Ratios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent explicit zero material ratios from being retained in backend clothing extraction profiles.

**Architecture:** Keep normalization centralized in `_normalize_ratio`. Boolean, nonfinite, negative, and zero values all normalize to `None`; positive percentages still normalize into the `0..1` range.

**Tech Stack:** Python, unittest.

---

### Task 1: Filter zero backend material ratios

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-backend-extractor-filter-zero-ratios.md`
- Modify: `tests/test_clothing_extraction.py`
- Modify: `backend/clothing_extraction/extractor.py`

- [x] **Step 1: Add failing backend extractor coverage**

Add a test with:

```python
"material_ratios": {"cotton": 0, "wool": 70}
```

Assert the extracted profile has `{"wool": 0.7}` and does not retain `cotton`.

Run from repo root:

```bash
python -m unittest tests.test_clothing_extraction
```

Expected: FAIL because zero ratios are currently retained.

- [x] **Step 2: Implement zero-ratio filtering**

Change `_normalize_ratio`:

```python
if ratio <= 0:
    return None
```

- [x] **Step 3: Run target and backend verification**

Run from repo root:

```bash
python -m unittest tests.test_clothing_extraction
python -m unittest discover tests
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 4: Commit locally**

Run from repo root:

```bash
git add docs/superpowers/plans/2026-05-30-backend-extractor-filter-zero-ratios.md tests/test_clothing_extraction.py backend/clothing_extraction/extractor.py
git commit -m "fix: filter zero backend material ratios"
```

Expected: one local commit. Do not push or upload.
