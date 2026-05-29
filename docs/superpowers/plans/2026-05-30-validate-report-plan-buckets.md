# Validate Report Plan Buckets Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed `LaundryPlan.buckets` before report sections read bucket fields.

**Architecture:** Extend the report boundary validation in `backend/reports/generator.py`. `_validate_plan` should keep the existing top-level `LaundryPlan` check, then validate that `plan.buckets` is a list and each entry is a `LaundryBucket`.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate report plan buckets

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add this test after `test_report_requires_laundry_plan`:

```python
def test_report_requires_valid_plan_buckets(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    invalid_plans = [
        ("buckets", LaundryPlan(buckets="buckets")),  # type: ignore[arg-type]
        (r"buckets\[0\]", LaundryPlan(buckets=[object()])),  # type: ignore[list-item]
    ]

    for field_name, plan in invalid_plans:
        with self.subTest(field_name=field_name, plan=plan):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_plan_buckets -v`

Expected: FAIL because invalid buckets currently leak downstream `AttributeError` or unrelated report item lookup errors.

- [x] **Step 3: Write minimal implementation**

Update `_validate_plan`:

```python
def _validate_plan(value: object) -> None:
    if not isinstance(value, LaundryPlan):
        raise ValueError("plan must be a LaundryPlan")
    if not isinstance(value.buckets, list):
        raise ValueError("plan.buckets must be a list")
    for index, bucket in enumerate(value.buckets):
        if not isinstance(bucket, LaundryBucket):
            raise ValueError(f"plan.buckets[{index}] must be a LaundryBucket")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_plan_buckets -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-plan-buckets.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report plan buckets"
```

Expected: one local commit. Do not push or upload.
