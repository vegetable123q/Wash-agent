# Validate Frequency Inputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `advise_frequency` reject malformed top-level inputs before frequency logic accesses wardrobe or constraint fields.

**Architecture:** Add small validation helpers in `backend/wardrobe/frequency_advisor.py` and call them at the top of `advise_frequency`. Keep scoring logic unchanged.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Validate advise_frequency inputs

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [x] **Step 1: Write the failing test**

Add this test near existing frequency advisor tests:

```python
def test_frequency_requires_item_and_constraints(self) -> None:
    item = self.store.get_item("wm-white-tee-001")
    assert item is not None

    invalid_items: list[object] = [object(), "item"]
    for invalid_item in invalid_items:
        with self.subTest(invalid_item=invalid_item):
            with self.assertRaisesRegex(ValueError, "item"):
                advise_frequency(
                    invalid_item,  # type: ignore[arg-type]
                    LaundryConstraints(),
                )

    invalid_constraints: list[object] = [None, object(), {"urgent_item_ids": []}]
    for constraints in invalid_constraints:
        with self.subTest(constraints=constraints):
            with self.assertRaisesRegex(ValueError, "constraints"):
                advise_frequency(
                    item,
                    constraints,  # type: ignore[arg-type]
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_item_and_constraints -v`

Expected: FAIL because malformed inputs currently leak attribute errors.

- [x] **Step 3: Write minimal implementation**

At the top of `advise_frequency`, call:

```python
_validate_item(item)
_validate_constraints(constraints)
```

Add helpers requiring `WardrobeItem` and `LaundryConstraints`.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_item_and_constraints -v`

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
git add docs/superpowers/plans/2026-05-30-validate-frequency-inputs.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py
git commit -m "fix: validate frequency inputs"
```

Expected: one local commit. Do not push or upload.
