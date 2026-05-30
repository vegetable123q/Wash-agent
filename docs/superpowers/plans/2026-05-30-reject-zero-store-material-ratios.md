# Reject Zero Store Material Ratios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure persisted wardrobe profiles reject zero material ratios so no zero-contribution material key can affect washing advice.

**Architecture:** Keep the validation at the wardrobe storage boundary where JSON payloads are converted into `ClothingProfile` objects. This matches the existing strict validation style in `backend/wardrobe/store.py` and keeps downstream planner/advisor code from seeing impossible material ratios.

**Tech Stack:** Python dataclasses, `unittest`, existing `WardrobeStore` JSON fixture tests.

---

### Task 1: Reject Zero Material Ratios In Wardrobe Store

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add `{"cotton": 0}` to `test_store_rejects_invalid_profile_material_ratios` in `tests/test_c_module.py`.

- [x] **Step 2: Run test to verify it fails**

Run: `python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_material_ratios`

Expected: FAIL because `WardrobeStore.list_items()` currently accepts `0` as a valid material ratio.

- [x] **Step 3: Write minimal implementation**

In `backend/wardrobe/store.py`, update `_ratio_map` so a ratio must be finite and greater than `0` while still allowing `1`.

- [x] **Step 4: Run test to verify it passes**

Run: `python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_material_ratios`

Expected: PASS.

- [x] **Step 5: Run relevant verification**

Run:
- `python -m unittest tests.test_c_module`
- `python -m unittest discover tests`
- `git diff --check`

Expected: all commands exit 0.

- [x] **Step 6: Commit locally**

Run:
- `git status --short`
- `git add docs/superpowers/plans/2026-05-30-reject-zero-store-material-ratios.md tests/test_c_module.py backend/wardrobe/store.py`
- `git commit -m "fix: reject zero stored material ratios"`

Expected: local commit created; no upload or push.
