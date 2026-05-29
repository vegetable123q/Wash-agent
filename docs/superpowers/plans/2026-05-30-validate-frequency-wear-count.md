# Validate Frequency Wear Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frequency advice reject malformed `wear_count_since_wash` values instead of accepting invalid counts in score calculations.

**Architecture:** Keep the validation in `backend/wardrobe/frequency_advisor.py` because this module accepts `WardrobeItem` objects directly. Add a small `_non_negative_int` helper and call it from `_validate_item` before threshold scoring.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate wear count before scoring

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing frequency validation tests:

```python
def test_frequency_requires_valid_wear_count(self) -> None:
    invalid_counts: list[object] = [True, -1, 1.5, "2"]

    for count in invalid_counts:
        with self.subTest(count=count):
            item = self.store.get_item("wm-white-tee-001")
            assert item is not None
            item.wear_count_since_wash = count  # type: ignore[assignment]

            with self.assertRaisesRegex(ValueError, "wear_count_since_wash"):
                advise_frequency(item, LaundryConstraints())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_wear_count -v`

Expected: FAIL because invalid counts are currently accepted or leak unrelated comparison errors.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _non_negative_int(value: object, field_name: str) -> None:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{field_name} must be a non-negative integer")
    if value < 0:
        raise ValueError(f"{field_name} must be a non-negative integer")
```

Then update `_validate_item`:

```python
def _validate_item(value: object) -> None:
    if not isinstance(value, WardrobeItem):
        raise ValueError("item must be a WardrobeItem")
    _non_negative_int(value.wear_count_since_wash, "wear_count_since_wash")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_wear_count -v`

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
git add docs/superpowers/plans/2026-05-30-validate-frequency-wear-count.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py
git commit -m "fix: validate frequency wear count"
```

Expected: one local commit. Do not push or upload.
