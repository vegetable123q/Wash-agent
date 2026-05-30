# Validate Report Cost Line Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed metadata on `LaundryChargeLine` entries before returning them in `WashReport.cost_breakdown`.

**Architecture:** Extend `_validate_cost_breakdown` in `backend/reports/generator.py` to validate the remaining charge-line fields that are returned to callers: `bucket_id`, `machine_id`, `machine_type`, and `program`. Reuse existing string and enum helpers.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate cost line metadata

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add this test after `test_report_requires_valid_cost_breakdown`:

```python
def test_report_requires_valid_cost_line_metadata(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    bucket = LaundryBucket(
        bucket_id="light-standard",
        item_ids=["white-tee"],
        wash_method=WashMethod.MACHINE_WASH,
    )

    def invalid_plan(line: LaundryChargeLine) -> LaundryPlan:
        return LaundryPlan(
            buckets=[bucket],
            estimated_cost_yuan=0,
            estimated_duration_minutes=0,
            cost_breakdown=[line],
        )

    invalid_plans = [
        (
            "bucket_id",
            invalid_plan(LaundryChargeLine(bucket_id=True, label="wash", amount_yuan=1, duration_minutes=30)),
        ),
        (
            "bucket_id",
            invalid_plan(LaundryChargeLine(bucket_id="", label="wash", amount_yuan=1, duration_minutes=30)),
        ),
        (
            "machine_id",
            invalid_plan(LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=1, duration_minutes=30, machine_id=True)),
        ),
        (
            "machine_type",
            invalid_plan(LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=1, duration_minutes=30, machine_type="standard_washer")),
        ),
        (
            "program",
            invalid_plan(LaundryChargeLine(bucket_id="light-standard", label="wash", amount_yuan=1, duration_minutes=30, program=True)),
        ),
    ]

    for field_name, plan in invalid_plans:
        with self.subTest(field_name=field_name, plan=plan):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_cost_line_metadata -v`

Expected: FAIL because malformed metadata currently returns in `WashReport.cost_breakdown`.

- [x] **Step 3: Write minimal implementation**

Extend `_validate_cost_breakdown` after the `field_name` assignment:

```python
_non_empty_string(line.bucket_id, f"{field_name}.bucket_id")
_string(line.machine_id, f"{field_name}.machine_id")
_enum_field(line.machine_type, MachineType, f"{field_name}.machine_type")
_string(line.program, f"{field_name}.program")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_cost_line_metadata -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-cost-line-metadata.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report cost line metadata"
```

Expected: one local commit. Do not push or upload.
