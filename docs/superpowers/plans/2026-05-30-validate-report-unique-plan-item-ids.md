# Validate Report Unique Plan Item IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report()` reject a malformed `LaundryPlan` that assigns the same item ID to multiple report buckets or repeats it inside one bucket.

**Architecture:** Add a report-side validation pass after missing item IDs are checked. Traverse `plan.buckets[*].item_ids`, track seen IDs, and raise a clear duplicate-ID error before rendering sections and action steps.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject duplicate plan item IDs in reports

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add a focused report validation test near existing missing item ID coverage:

```python
def test_report_requires_unique_plan_item_ids(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    plan = LaundryPlan(
        buckets=[
            LaundryBucket(
                bucket_id="first",
                item_ids=["white-tee"],
                wash_method=WashMethod.HAND_WASH,
                dry_method=DryMethod.AIR_DRY,
            ),
            LaundryBucket(
                bucket_id="second",
                item_ids=["white-tee"],
                wash_method=WashMethod.HAND_WASH,
                dry_method=DryMethod.AIR_DRY,
            ),
        ],
        estimated_cost_yuan=0,
        estimated_duration_minutes=0,
    )

    with self.assertRaisesRegex(ValueError, "duplicate.*white-tee"):
        generate_report(plan, items, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_unique_plan_item_ids -v`

Expected: FAIL because duplicate plan item IDs currently render twice.

- [x] **Step 3: Write minimal implementation**

In `generate_report()`, call a new helper after `_validate_plan_item_ids_present(...)`:

```python
_validate_plan_item_ids_unique(plan)
```

The helper should collect repeated IDs and raise:

```python
raise ValueError(f"plan duplicate item ids: {', '.join(dedupe(duplicates))}")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_unique_plan_item_ids -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-unique-plan-item-ids.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report unique plan item ids"
```

Expected: one local commit. Do not push or upload.
