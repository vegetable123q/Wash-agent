# Validate Report Bucket Text Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed bucket text fields and warnings before they are interpolated into user-facing report text.

**Architecture:** Extend `_validate_bucket` in `backend/reports/generator.py` with string checks for bucket text fields and non-empty string-list checks for `warnings`. This keeps report validation close to the report boundary without changing shared dataclass constructors.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate bucket text fields

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add this test after `test_report_requires_valid_bucket_enum_fields`:

```python
def test_report_requires_valid_bucket_text_fields(self) -> None:
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
        ("bucket_id", invalid_plan(bucket_id=True)),
        ("bucket_id", invalid_plan(bucket_id="")),
        ("machine_id", invalid_plan(machine_id=True)),
        ("machine_location", invalid_plan(machine_location=True)),
        ("program", invalid_plan(program=True)),
        ("dryer_machine_id", invalid_plan(dryer_machine_id=True)),
        ("dryer_machine_location", invalid_plan(dryer_machine_location=True)),
        ("warnings", invalid_plan(warnings="warning")),
        (r"warnings\[0\]", invalid_plan(warnings=[True])),
        (r"warnings\[0\]", invalid_plan(warnings=[""])),
    ]

    for field_name, plan in invalid_plans:
        with self.subTest(field_name=field_name, plan=plan):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_bucket_text_fields -v`

Expected: FAIL because invalid text fields currently render into output or warnings are iterated incorrectly.

- [x] **Step 3: Write minimal implementation**

Update `_validate_bucket`:

```python
_non_empty_string(bucket.bucket_id, f"{field_name}.bucket_id")
_string(bucket.machine_id, f"{field_name}.machine_id")
_string(bucket.machine_location, f"{field_name}.machine_location")
_string(bucket.program, f"{field_name}.program")
_string(bucket.dryer_machine_id, f"{field_name}.dryer_machine_id")
_string(bucket.dryer_machine_location, f"{field_name}.dryer_machine_location")
_non_empty_string_list(bucket.warnings, f"{field_name}.warnings")
```

Add:

```python
def _string(value: object, field_name: str) -> None:
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_bucket_text_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-bucket-text-fields.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report bucket text fields"
```

Expected: one local commit. Do not push or upload.
