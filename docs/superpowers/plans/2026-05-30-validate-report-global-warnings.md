# Validate Report Global Warnings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed `LaundryPlan.global_warnings` before composing the report risk section.

**Architecture:** Reuse the report generator's existing non-empty string-list validation and call it from `_validate_plan` for `plan.global_warnings`. This keeps behavior aligned with bucket warning validation.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate plan global warnings

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add this test after `test_report_requires_valid_plan_estimates`:

```python
def test_report_requires_valid_global_warnings(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    bucket = LaundryBucket(
        bucket_id="light-standard",
        item_ids=["white-tee"],
        wash_method=WashMethod.MACHINE_WASH,
    )

    def invalid_plan(global_warnings: object) -> LaundryPlan:
        return LaundryPlan(
            buckets=[bucket],
            estimated_cost_yuan=0,
            estimated_duration_minutes=0,
            global_warnings=global_warnings,  # type: ignore[arg-type]
        )

    invalid_plans = [
        ("global_warnings", invalid_plan("warning")),
        (r"global_warnings\[0\]", invalid_plan([True])),
        (r"global_warnings\[0\]", invalid_plan([""])),
    ]

    for field_name, plan in invalid_plans:
        with self.subTest(field_name=field_name, plan=plan):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_global_warnings -v`

Expected: FAIL because malformed global warnings currently leak into risk rendering.

- [x] **Step 3: Write minimal implementation**

Update `_validate_plan`:

```python
_non_empty_string_list(value.global_warnings, "plan.global_warnings")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_global_warnings -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-global-warnings.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report global warnings"
```

Expected: one local commit. Do not push or upload.
