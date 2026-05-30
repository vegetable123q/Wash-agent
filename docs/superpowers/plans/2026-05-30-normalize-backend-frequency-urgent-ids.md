# Normalize Backend Frequency Urgent IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make backend frequency advice trim and dedupe `urgent_item_ids`, matching frontend frequency advisor behavior.

**Architecture:** Keep existing constraint shape validation, then compare against a normalized urgent ID set inside `advise_frequency()`.

**Tech Stack:** Python, `unittest`, `uv`.

---

### Task 1: Normalize backend frequency urgent IDs

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [x] **Step 1: Write the failing test**

Add near existing frequency priority coverage:

```python
def test_frequency_trims_urgent_item_ids_before_matching(self) -> None:
    item = WardrobeItem(
        profile=ClothingProfile(
            item_id="urgent-tee",
            name="cotton t-shirt",
            material_ratios={"cotton": 1.0},
            colors=["white"],
        ),
        wear_count_since_wash=0,
    )

    advice = advise_frequency(
        item,
        LaundryConstraints(urgent_item_ids=[" urgent-tee ", " urgent-tee "]),
    )

    self.assertGreaterEqual(advice.priority_score, 25)
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_trims_urgent_item_ids_before_matching -v`

Expected: FAIL because whitespace-padded urgent IDs currently do not match the item ID.

- [x] **Step 3: Write minimal implementation**

In `advise_frequency()`:

```python
urgent_item_ids = set(_normalized_item_ids(constraints.urgent_item_ids))
...
if item.profile.item_id in urgent_item_ids:
```

Add:

```python
def _normalized_item_ids(item_ids: list[str]) -> list[str]:
    return dedupe([item_id.strip() for item_id in item_ids])
```

- [x] **Step 4: Run target backend test**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_trims_urgent_item_ids_before_matching -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_c_module -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-normalize-backend-frequency-urgent-ids.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py
git commit -m "fix: normalize backend frequency urgent ids"
```

Expected: one local commit. Do not push or upload.
