# Validate Report Missing Plan Item Ids Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject all missing plan item ids before rendering, with an error that lists every missing id.

**Architecture:** Add a pre-render consistency check after validating `plan` and `items`, before building report sections.

**Tech Stack:** Python validation, `unittest`, `uv`.

---

### Task 1: Report all missing plan item ids

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add `test_report_lists_all_missing_plan_item_ids` near the report item validation tests:

```python
def test_report_lists_all_missing_plan_item_ids(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    plan = LaundryPlan(
        buckets=[
            LaundryBucket(
                bucket_id="missing-items",
                item_ids=["missing-a", "missing-b"],
                wash_method=WashMethod.MACHINE_WASH,
            )
        ],
        estimated_cost_yuan=0,
        estimated_duration_minutes=0,
    )

    with self.assertRaisesRegex(ValueError, r"missing-a.*missing-b"):
        generate_report(plan, items, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_lists_all_missing_plan_item_ids -v`

Expected: FAIL because current rendering raises on only the first missing id.

- [x] **Step 3: Write minimal implementation**

Call `_validate_plan_item_ids_present(plan, items)` before building `item_names`.

Add:

```python
def _validate_plan_item_ids_present(plan: LaundryPlan, items: list[WardrobeItem]) -> None:
    item_ids = {item.profile.item_id for item in items}
    missing = [
        item_id
        for bucket in plan.buckets
        for item_id in bucket.item_ids
        if item_id not in item_ids
    ]
    if missing:
        raise ValueError(f"items missing plan item ids: {', '.join(dedupe(missing))}")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_lists_all_missing_plan_item_ids -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-missing-plan-item-ids.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report missing plan item ids"
```

Expected: one local commit. Do not push or upload.
