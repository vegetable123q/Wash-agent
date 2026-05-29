# Validate Planner Numeric Constraints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make laundry planning reject malformed numeric constraints before cost and wait-time comparisons run.

**Architecture:** Extend `backend/laundry/planner.py` entry-point constraint validation. Reuse the module's `math.isfinite` import and keep helpers small: one for optional non-negative numbers and one for optional non-negative integer minutes.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject malformed planner numeric constraints

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing constraint validation tests:

```python
def test_constraints_require_valid_numeric_limits(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    invalid_budgets: list[object] = [True, "2", -1, float("nan"), float("inf")]
    invalid_waits: list[object] = [True, "5", 1.5, -1, float("nan"), float("inf")]

    for budget_yuan in invalid_budgets:
        with self.subTest(field="budget_yuan", value=budget_yuan):
            with self.assertRaisesRegex(ValueError, "budget_yuan"):
                plan_laundry(
                    items,
                    LaundryConstraints(selected_item_ids=["white-tee"], budget_yuan=budget_yuan),  # type: ignore[arg-type]
                    _campus_context(),
                )

    for max_wait_minutes in invalid_waits:
        with self.subTest(field="max_wait_minutes", value=max_wait_minutes):
            with self.assertRaisesRegex(ValueError, "max_wait_minutes"):
                plan_laundry(
                    items,
                    LaundryConstraints(selected_item_ids=["white-tee"], max_wait_minutes=max_wait_minutes),  # type: ignore[arg-type]
                    _campus_context(),
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_constraints_require_valid_numeric_limits -v`

Expected: FAIL because malformed numeric constraints currently fall through to comparison logic.

- [x] **Step 3: Write minimal implementation**

In `_validate_constraints`, add:

```python
_optional_non_negative_number(constraints.budget_yuan, "budget_yuan")
_optional_non_negative_int(constraints.max_wait_minutes, "max_wait_minutes")
```

Add:

```python
def _optional_non_negative_number(value: object, field_name: str) -> float | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise ValueError(f"{field_name} must be numeric")
    number = float(value)
    if not math.isfinite(number) or number < 0:
        raise ValueError(f"{field_name} must be a non-negative finite number")
    return number


def _optional_non_negative_int(value: object, field_name: str) -> int | None:
    if value is None:
        return None
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{field_name} must be a non-negative integer")
    if value < 0:
        raise ValueError(f"{field_name} must be a non-negative integer")
    return value
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_constraints_require_valid_numeric_limits -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_e_module -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-planner-numeric-constraints.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate planner numeric constraints"
```

Expected: one local commit. Do not push or upload.
