# Validate Queue Estimate Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make laundry planning reject malformed fields inside `MachineQueueEstimate` objects before bad queue values affect wait-time warnings.

**Architecture:** Extend the existing campus context validation path in `backend/laundry/planner.py`. `_queue_estimate_list` should continue checking list shape, then validate each estimate's enum and count fields.

**Tech Stack:** Python dataclasses, enums, `unittest`, `uv`.

---

### Task 1: Validate MachineQueueEstimate field shapes

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing campus context validation tests:

```python
def test_plan_requires_valid_queue_estimate_fields(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    cases: list[tuple[str, object]] = [
        ("machine_type", "washer"),
        ("total_count", True),
        ("total_count", -1),
        ("available_count", -1),
        ("running_count", 1.5),
        ("out_of_service_count", -1),
        ("unknown_count", -1),
        ("estimated_wait_minutes", True),
        ("estimated_wait_minutes", 1.5),
        ("estimated_wait_minutes", -1),
    ]

    for field_name, value in cases:
        with self.subTest(field_name=field_name, value=value):
            context = _campus_context()
            setattr(context.queue_estimates[0], field_name, value)

            with self.assertRaisesRegex(ValueError, field_name):
                plan_laundry(
                    items,
                    LaundryConstraints(selected_item_ids=["white-tee"], max_wait_minutes=5),
                    context,
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_queue_estimate_fields -v`

Expected: FAIL because malformed `MachineQueueEstimate` fields currently pass silently or raise unrelated errors.

- [x] **Step 3: Write minimal implementation**

Update `_queue_estimate_list` to call `_validate_queue_estimate(estimate, f"campus_context.{field_name}[{index}]")`.

Add helpers for:
- enum field: `machine_type`
- required non-negative integer counts: `total_count`, `available_count`, `running_count`, `out_of_service_count`, `unknown_count`
- optional non-negative integer: `estimated_wait_minutes`

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_queue_estimate_fields -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_e_module -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [ ] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-queue-estimate-fields.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate queue estimate fields"
```

Expected: one local commit. Do not push or upload.
