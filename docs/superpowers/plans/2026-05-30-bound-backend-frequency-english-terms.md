# Bound Backend Frequency English Terms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent backend frequency advice from matching short English terms inside unrelated words, matching the frontend frequency advisor's `termMatches()` behavior.

**Architecture:** Keep shared `contains_any()` unchanged for other modules. Add local frequency-specific term matching in `backend/wardrobe/frequency_advisor.py` and use it for threshold, sport, stain, low-frequency, and hygiene checks.

**Tech Stack:** Python, `unittest`, `uv`.

---

### Task 1: Add word-boundary matching for backend frequency terms

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-bound-backend-frequency-english-terms.md`
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [x] **Step 1: Add failing backend test**

Add near existing frequency recommendation tests:

```python
def test_frequency_does_not_match_sport_inside_unrelated_english_words(self) -> None:
    item = WardrobeItem(
        profile=ClothingProfile(
            item_id="commute-tee",
            name="transport t-shirt",
            material_ratios={"cotton": 1.0},
            colors=["white"],
        ),
        wear_count_since_wash=0,
    )

    advice = advise_frequency(item, LaundryConstraints())

    self.assertEqual(advice.priority_score, 0)
```

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_does_not_match_sport_inside_unrelated_english_words -v`

Expected: FAIL because `transport` currently contains the substring `sport`.

- [x] **Step 2: Implement local term matching**

In `backend/wardrobe/frequency_advisor.py`:

```python
import re
```

Add:

```python
_ENGLISH_TERM_RE = re.compile(r"^[a-z0-9 -]+$", re.IGNORECASE)


def _term_matches(text: str, term: str) -> bool:
    if _ENGLISH_TERM_RE.fullmatch(term):
        return re.search(rf"(^|[^a-z0-9]){re.escape(term)}([^a-z0-9]|$)", text) is not None
    return term in text


def _contains_term(text: str, terms: set[str]) -> bool:
    return any(_term_matches(text, term) for term in terms)
```

Use `_term_matches()` in `_threshold_for()` and `_contains_term()` in the frequency scoring checks.

- [x] **Step 3: Run target backend test**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_does_not_match_sport_inside_unrelated_english_words -v`

Expected: PASS.

- [x] **Step 4: Run focused and full backend tests**

Run:

```bash
uv run python -m unittest tests.test_c_module -v
uv run python -m unittest discover -v
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 5: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-bound-backend-frequency-english-terms.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py
git commit -m "fix: bound backend frequency english terms"
```

Expected: one local commit. Do not push or upload.
