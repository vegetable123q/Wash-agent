# Validate Report Cost Breakdown Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed plan cost breakdown entries before rendering the cost/time section.

**Architecture:** Add a `_validate_cost_breakdown` helper in `backend/reports/generator.py` and call it from `_validate_plan` after plan estimates. Validate the list shape, `LaundryChargeLine` entries, and the fields rendered by `_cost_time_section`: `label`, `amount_yuan`, and `duration_minutes`.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate cost breakdown entries

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add `LaundryChargeLine` to the shared model imports and add this test after `test_report_requires_valid_plan_estimates`:

```python
def test_report_requires_valid_cost_breakdown(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    bucket = LaundryBucket(
        bucket_id="light-standard",
        item_ids=["white-tee"],
        wash_method=WashMethod.MACHINE_WASH,
    )

    def invalid_plan(cost_breakdown: object) -> LaundryPlan:
        return LaundryPlan(
            buckets=[bucket],
            estimated_cost_yuan=0,
            estimated_duration_minutes=0,
            cost_breakdown=cost_breakdown,  # type: ignore[arg-type]
        )

    invalid_plans = [
        ("cost_breakdown", invalid_plan("costs")),
        (r"cost_breakdown\[0\]", invalid_plan([object()])),
        (
            "label",
            invalid_plan([LaundryChargeLine(bucket_id="light-standard", label=True, amount_yuan=1, duration_minutes=30)]),
        ),
        (
            "label",
            invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="", amount_yuan=1, duration_minutes=30)]),
        ),
        (
            "amount_yuan",
            invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=True, duration_minutes=30)]),
        ),
        (
            "amount_yuan",
            invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=float("inf"), duration_minutes=30)]),
        ),
        (
            "amount_yuan",
            invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=-1, duration_minutes=30)]),
        ),
        (
            "duration_minutes",
            invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=1, duration_minutes=True)]),
        ),
        (
            "duration_minutes",
            invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=1, duration_minutes=1.5)]),
        ),
        (
            "duration_minutes",
            invalid_plan([LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=1, duration_minutes=-1)]),
        ),
    ]

    for field_name, plan in invalid_plans:
        with self.subTest(field_name=field_name, plan=plan):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_cost_breakdown -v`

Expected: FAIL because malformed `cost_breakdown` currently leaks to rendering or is returned unchanged.

- [x] **Step 3: Write minimal implementation**

Update `_validate_plan`:

```python
_validate_cost_breakdown(value.cost_breakdown)
```

Add:

```python
def _validate_cost_breakdown(value: object) -> None:
    if not isinstance(value, list):
        raise ValueError("plan.cost_breakdown must be a list")
    for index, line in enumerate(value):
        if not isinstance(line, LaundryChargeLine):
            raise ValueError(f"plan.cost_breakdown[{index}] must be a LaundryChargeLine")
        field_name = f"plan.cost_breakdown[{index}]"
        _non_empty_string(line.label, f"{field_name}.label")
        _required_non_negative_number(line.amount_yuan, f"{field_name}.amount_yuan")
        _required_non_negative_int(line.duration_minutes, f"{field_name}.duration_minutes")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_cost_breakdown -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-cost-breakdown.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report cost breakdown"
```

Expected: one local commit. Do not push or upload.
