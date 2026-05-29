# Validate Report Bucket Item IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed bucket `item_ids` before report rendering treats invalid values as item references.

**Architecture:** Add a small `_validate_bucket` helper in `backend/reports/generator.py` and call it from `_validate_plan` after confirming each entry is a `LaundryBucket`. Validate only the `item_ids` field in this iteration so the diff stays narrow.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate bucket item IDs

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add `LaundryBucket` to the shared model imports and add this test after `test_report_requires_valid_plan_buckets`:

```python
def test_report_requires_valid_bucket_item_ids(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    invalid_plans = [
        (
            "item_ids",
            LaundryPlan(
                buckets=[LaundryBucket(bucket_id="light-standard", item_ids="white-tee", wash_method=WashMethod.MACHINE_WASH)]
            ),
        ),
        (
            r"item_ids\[0\]",
            LaundryPlan(
                buckets=[LaundryBucket(bucket_id="light-standard", item_ids=[True], wash_method=WashMethod.MACHINE_WASH)]
            ),
        ),
        (
            r"item_ids\[0\]",
            LaundryPlan(
                buckets=[LaundryBucket(bucket_id="light-standard", item_ids=[""], wash_method=WashMethod.MACHINE_WASH)]
            ),
        ),
    ]

    for field_name, plan in invalid_plans:
        with self.subTest(field_name=field_name, plan=plan):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_bucket_item_ids -v`

Expected: FAIL because invalid `item_ids` currently leak into report item lookup or string iteration.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _validate_bucket(bucket: LaundryBucket, field_name: str) -> None:
    _non_empty_string_list(bucket.item_ids, f"{field_name}.item_ids")


def _non_empty_string_list(value: object, field_name: str) -> None:
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list")
    for index, item in enumerate(value):
        _non_empty_string(item, f"{field_name}[{index}]")
```

Then call `_validate_bucket(bucket, f"plan.buckets[{index}]")` from `_validate_plan`.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_bucket_item_ids -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-bucket-item-ids.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report bucket item ids"
```

Expected: one local commit. Do not push or upload.
