# Validate Report Queue Estimate List Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed campus queue estimate lists before rendering queue summaries.

**Architecture:** Extend `_validate_campus_context` in `backend/reports/generator.py` to validate `queue_estimates` as a list of `MachineQueueEstimate`. Detailed field validation remains a follow-up small iteration.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate queue estimate list shape

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add this test after `test_report_requires_valid_campus_machine_fields`:

```python
def test_report_requires_valid_queue_estimate_list(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())
    invalid_contexts = [
        ("queue_estimates", CampusContext(queue_estimates="queues")),
        (r"queue_estimates\[0\]", CampusContext(queue_estimates=[object()])),
    ]

    for field_name, campus_context in invalid_contexts:
        with self.subTest(field_name=field_name, campus_context=campus_context):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, campus_context)
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_queue_estimate_list -v`

Expected: FAIL because malformed queue estimate lists currently leak into queue rendering.

- [x] **Step 3: Write minimal implementation**

Update `_validate_campus_context`:

```python
_queue_estimate_list(value.queue_estimates)
```

Add:

```python
def _queue_estimate_list(value: object) -> None:
    if not isinstance(value, list):
        raise ValueError("campus_context.queue_estimates must be a list of MachineQueueEstimate")
    for index, estimate in enumerate(value):
        if not isinstance(estimate, MachineQueueEstimate):
            raise ValueError(f"campus_context.queue_estimates[{index}] must be a MachineQueueEstimate")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_queue_estimate_list -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-queue-estimate-list.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report queue estimate list"
```

Expected: one local commit. Do not push or upload.
