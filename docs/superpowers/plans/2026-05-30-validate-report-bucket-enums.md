# Validate Report Bucket Enums Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed bucket enum fields before report rendering indexes label maps.

**Architecture:** Extend `_validate_bucket` in `backend/reports/generator.py` to validate only the enum fields used by report formatting: `wash_method`, `machine_type`, and `dry_method`. Keep the helper generic enough for the existing enum types without introducing broader schema validation.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate bucket enum fields

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add this test after `test_report_requires_valid_bucket_item_ids`:

```python
def test_report_requires_valid_bucket_enum_fields(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    invalid_plans = [
        (
            "wash_method",
            LaundryPlan(
                buckets=[
                    LaundryBucket(
                        bucket_id="light-standard",
                        item_ids=["white-tee"],
                        wash_method="machine_wash",
                    )
                ],
                estimated_cost_yuan=0,
                estimated_duration_minutes=0,
            ),
        ),
        (
            "machine_type",
            LaundryPlan(
                buckets=[
                    LaundryBucket(
                        bucket_id="light-standard",
                        item_ids=["white-tee"],
                        wash_method=WashMethod.MACHINE_WASH,
                        machine_type="standard_washer",
                    )
                ],
                estimated_cost_yuan=0,
                estimated_duration_minutes=0,
            ),
        ),
        (
            "dry_method",
            LaundryPlan(
                buckets=[
                    LaundryBucket(
                        bucket_id="light-standard",
                        item_ids=["white-tee"],
                        wash_method=WashMethod.MACHINE_WASH,
                        dry_method="air_dry",
                    )
                ],
                estimated_cost_yuan=0,
                estimated_duration_minutes=0,
            ),
        ),
    ]

    for field_name, plan in invalid_plans:
        with self.subTest(field_name=field_name, plan=plan):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_bucket_enum_fields -v`

Expected: FAIL because invalid enum fields currently leak as `KeyError`.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _enum_field(value: object, enum_type: type[object], field_name: str) -> None:
    if not isinstance(value, enum_type):
        raise ValueError(f"{field_name} must be a {enum_type.__name__}")
```

Then update `_validate_bucket`:

```python
_enum_field(bucket.wash_method, WashMethod, f"{field_name}.wash_method")
_enum_field(bucket.machine_type, MachineType, f"{field_name}.machine_type")
_enum_field(bucket.dry_method, DryMethod, f"{field_name}.dry_method")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_bucket_enum_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-bucket-enums.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report bucket enums"
```

Expected: one local commit. Do not push or upload.
