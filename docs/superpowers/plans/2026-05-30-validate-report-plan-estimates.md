# Validate Report Plan Estimates Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed plan-level estimated cost and duration before the cost/time section is rendered.

**Architecture:** Extend `_validate_plan` in `backend/reports/generator.py` with required non-negative finite cost and required non-negative integer duration checks. Reuse the existing optional numeric helpers so behavior stays aligned with bucket numeric validation.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate plan-level estimates

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add this test after `test_report_requires_valid_plan_buckets`:

```python
def test_report_requires_valid_plan_estimates(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    bucket = LaundryBucket(
        bucket_id="light-standard",
        item_ids=["white-tee"],
        wash_method=WashMethod.MACHINE_WASH,
    )
    invalid_plans = [
        ("estimated_cost_yuan", LaundryPlan(buckets=[bucket], estimated_cost_yuan=True, estimated_duration_minutes=0)),
        ("estimated_cost_yuan", LaundryPlan(buckets=[bucket], estimated_cost_yuan=float("inf"), estimated_duration_minutes=0)),
        ("estimated_cost_yuan", LaundryPlan(buckets=[bucket], estimated_cost_yuan=-1, estimated_duration_minutes=0)),
        ("estimated_duration_minutes", LaundryPlan(buckets=[bucket], estimated_cost_yuan=0, estimated_duration_minutes=True)),
        ("estimated_duration_minutes", LaundryPlan(buckets=[bucket], estimated_cost_yuan=0, estimated_duration_minutes=1.5)),
        ("estimated_duration_minutes", LaundryPlan(buckets=[bucket], estimated_cost_yuan=0, estimated_duration_minutes=-1)),
    ]

    for field_name, plan in invalid_plans:
        with self.subTest(field_name=field_name, plan=plan):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_plan_estimates -v`

Expected: FAIL because invalid plan-level estimates currently render into the cost/time report section.

- [x] **Step 3: Write minimal implementation**

Update `_validate_plan` after the top-level `LaundryPlan` type check:

```python
_required_non_negative_number(value.estimated_cost_yuan, "plan.estimated_cost_yuan")
_required_non_negative_int(value.estimated_duration_minutes, "plan.estimated_duration_minutes")
```

Add helpers:

```python
def _required_non_negative_number(value: object, field_name: str) -> None:
    if value is None:
        raise ValueError(f"{field_name} is required")
    _optional_non_negative_number(value, field_name)


def _required_non_negative_int(value: object, field_name: str) -> None:
    if value is None:
        raise ValueError(f"{field_name} is required")
    _optional_non_negative_int(value, field_name)
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_plan_estimates -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-plan-estimates.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report plan estimates"
```

Expected: one local commit. Do not push or upload.
