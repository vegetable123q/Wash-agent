# Bound Backend Planner English Terms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent backend laundry planning from matching short English bucket terms inside unrelated words, matching the frontend planner's `termMatches()` behavior.

**Architecture:** Keep shared `contains_any()` unchanged for other modules. Add local planner-specific term matching in `backend/laundry/planner.py` and use it for bucket assignment, drying warnings, dryer safety, and material checks.

**Tech Stack:** Python, `unittest`, `uv`.

---

### Task 1: Add word-boundary matching for backend planner terms

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-bound-backend-planner-english-terms.md`
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Add failing backend test**

Add near existing bucket split tests:

```python
def test_planner_does_not_match_color_terms_inside_unrelated_english_words(self) -> None:
    items = [
        _item(
            "berry-tee",
            "blackberry cotton t-shirt",
            colors=["white"],
            materials={"cotton": 1.0},
        )
    ]

    plan = plan_laundry(
        items,
        LaundryConstraints(selected_item_ids=["berry-tee"], allow_dryer=False),
        _campus_context(),
    )

    self.assertEqual(plan.buckets[0].bucket_id, "light-standard")
```

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_planner_does_not_match_color_terms_inside_unrelated_english_words -v`

Expected: FAIL because the backend currently matches `black` inside `blackberry` and creates a `dark-standard` bucket.

- [x] **Step 2: Implement local term matching**

In `backend/laundry/planner.py`:

```python
import re
```

Add:

```python
_ENGLISH_TERM_RE = re.compile(r"^[a-z0-9 _-]+$", re.IGNORECASE)


def _contains_term(text: str, terms: set[str]) -> bool:
    return any(_term_matches(text, term) for term in terms)


def _term_matches(text: str, term: str) -> bool:
    if _ENGLISH_TERM_RE.fullmatch(term):
        return re.search(rf"(^|[^a-z0-9]){re.escape(term)}([^a-z0-9]|$)", text) is not None
    return term in text
```

Replace planner-local `contains_any(...)` calls with `_contains_term(...)`.

- [x] **Step 3: Run target backend test**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_planner_does_not_match_color_terms_inside_unrelated_english_words -v`

Expected: PASS.

- [x] **Step 4: Run focused and full backend tests**

Run:

```bash
uv run python -m unittest tests.test_e_module -v
uv run python -m unittest discover -v
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 5: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-bound-backend-planner-english-terms.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: bound backend planner english terms"
```

Expected: one local commit. Do not push or upload.
