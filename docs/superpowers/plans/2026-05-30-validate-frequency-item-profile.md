# Validate Frequency Item Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frequency advice reject `WardrobeItem` objects with malformed `profile` values before profile attributes are accessed.

**Architecture:** Keep the direct API guard in `backend/wardrobe/frequency_advisor.py`. Extend `_validate_item` to require `item.profile` to be a `ClothingProfile`, matching the shared data contract.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate item profile type before scoring

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing frequency validation tests:

```python
def test_frequency_requires_valid_item_profile(self) -> None:
    item = WardrobeItem(profile="profile")  # type: ignore[arg-type]

    with self.assertRaisesRegex(ValueError, "profile"):
        advise_frequency(item, LaundryConstraints())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_item_profile -v`

Expected: FAIL because the invalid profile currently leaks an `AttributeError`.

- [x] **Step 3: Write minimal implementation**

Update the import:

```python
from backend.shared.models import ClothingProfile, FrequencyAdvice, LaundryConstraints, RiskLevel, WardrobeItem
```

Then update `_validate_item`:

```python
def _validate_item(value: object) -> None:
    if not isinstance(value, WardrobeItem):
        raise ValueError("item must be a WardrobeItem")
    if not isinstance(value.profile, ClothingProfile):
        raise ValueError("item.profile must be a ClothingProfile")
    _non_negative_int(value.wear_count_since_wash, "wear_count_since_wash")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_item_profile -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_c_module -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [ ] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-frequency-item-profile.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py
git commit -m "fix: validate frequency item profile"
```

Expected: one local commit. Do not push or upload.
