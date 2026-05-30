# Validate Report Bucket Numeric Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed bucket numeric and boolean fields before they are rendered into report text.

**Architecture:** Extend `_validate_bucket` in `backend/reports/generator.py` with local helper validation for optional non-negative finite numbers, optional non-negative integers, and booleans. Keep the checks at the report boundary and do not change shared dataclass behavior.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate bucket numeric and boolean fields

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add this test after `test_report_requires_valid_bucket_text_fields`:

```python
def test_report_requires_valid_bucket_numeric_fields(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]

    def invalid_plan(**overrides: object) -> LaundryPlan:
        bucket_values = {
            "bucket_id": "light-standard",
            "item_ids": ["white-tee"],
            "wash_method": WashMethod.MACHINE_WASH,
        }
        bucket_values.update(overrides)
        return LaundryPlan(
            buckets=[LaundryBucket(**bucket_values)],  # type: ignore[arg-type]
            estimated_cost_yuan=0,
            estimated_duration_minutes=0,
        )

    invalid_plans = [
        ("detergent_ml", invalid_plan(detergent_ml=True)),
        ("detergent_ml", invalid_plan(detergent_ml=float("nan"))),
        ("detergent_ml", invalid_plan(detergent_ml=-1)),
        ("use_laundry_bag", invalid_plan(use_laundry_bag="yes")),
        ("estimated_cost_yuan", invalid_plan(estimated_cost_yuan=True)),
        ("estimated_cost_yuan", invalid_plan(estimated_cost_yuan=float("inf"))),
        ("estimated_cost_yuan", invalid_plan(estimated_cost_yuan=-1)),
        ("estimated_duration_minutes", invalid_plan(estimated_duration_minutes=True)),
        ("estimated_duration_minutes", invalid_plan(estimated_duration_minutes=1.5)),
        ("estimated_duration_minutes", invalid_plan(estimated_duration_minutes=-1)),
    ]

    for field_name, plan in invalid_plans:
        with self.subTest(field_name=field_name, plan=plan):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_bucket_numeric_fields -v`

Expected: FAIL because invalid numeric and boolean fields currently render into output or are accepted as truthy values.

- [x] **Step 3: Write minimal implementation**

Add `import math`, then update `_validate_bucket`:

```python
_optional_non_negative_number(bucket.detergent_ml, f"{field_name}.detergent_ml")
_boolean(bucket.use_laundry_bag, f"{field_name}.use_laundry_bag")
_optional_non_negative_number(bucket.estimated_cost_yuan, f"{field_name}.estimated_cost_yuan")
_optional_non_negative_int(bucket.estimated_duration_minutes, f"{field_name}.estimated_duration_minutes")
```

Add helpers:

```python
def _boolean(value: object, field_name: str) -> None:
    if not isinstance(value, bool):
        raise ValueError(f"{field_name} must be a boolean")


def _optional_non_negative_number(value: object, field_name: str) -> None:
    if value is None:
        return
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise ValueError(f"{field_name} must be numeric")
    if not math.isfinite(float(value)) or value < 0:
        raise ValueError(f"{field_name} must be a non-negative finite number")


def _optional_non_negative_int(value: object, field_name: str) -> None:
    if value is None:
        return
    if isinstance(value, bool) or not isinstance(value, int) or value < 0:
        raise ValueError(f"{field_name} must be a non-negative integer")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_bucket_numeric_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-bucket-numeric-fields.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report bucket numeric fields"
```

Expected: one local commit. Do not push or upload.
