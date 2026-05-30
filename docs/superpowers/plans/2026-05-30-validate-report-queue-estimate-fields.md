# Validate Report Queue Estimate Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed queue estimate fields before rendering queue summaries.

**Architecture:** Extend `_queue_estimate_list` in `backend/reports/generator.py` with a `_validate_queue_estimate` helper. Validate the fields rendered by `_queue_summary`: `machine_type`, `total_count`, `available_count`, and `estimated_wait_minutes`.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate queue estimate fields

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add this test after `test_report_requires_valid_queue_estimate_list`:

```python
def test_report_requires_valid_queue_estimate_fields(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())

    def invalid_context(**overrides: object) -> CampusContext:
        estimate_values = {
            "machine_type": MachineType.STANDARD_WASHER,
            "total_count": 1,
            "available_count": 1,
            "running_count": 0,
            "out_of_service_count": 0,
            "unknown_count": 0,
        }
        estimate_values.update(overrides)
        return CampusContext(
            queue_estimates=[MachineQueueEstimate(**estimate_values)],  # type: ignore[arg-type]
        )

    invalid_contexts = [
        ("machine_type", invalid_context(machine_type="standard_washer")),
        ("total_count", invalid_context(total_count=True)),
        ("total_count", invalid_context(total_count=1.5)),
        ("total_count", invalid_context(total_count=-1)),
        ("available_count", invalid_context(available_count=True)),
        ("available_count", invalid_context(available_count=1.5)),
        ("available_count", invalid_context(available_count=-1)),
        ("estimated_wait_minutes", invalid_context(estimated_wait_minutes=True)),
        ("estimated_wait_minutes", invalid_context(estimated_wait_minutes=1.5)),
        ("estimated_wait_minutes", invalid_context(estimated_wait_minutes=-1)),
    ]

    for field_name, campus_context in invalid_contexts:
        with self.subTest(field_name=field_name, campus_context=campus_context):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, campus_context)
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_queue_estimate_fields -v`

Expected: FAIL because malformed queue fields currently render into queue summaries.

- [x] **Step 3: Write minimal implementation**

Update `_queue_estimate_list`:

```python
_validate_queue_estimate(estimate, f"campus_context.queue_estimates[{index}]")
```

Add:

```python
def _validate_queue_estimate(estimate: MachineQueueEstimate, field_name: str) -> None:
    _enum_field(estimate.machine_type, MachineType, f"{field_name}.machine_type")
    _required_non_negative_int(estimate.total_count, f"{field_name}.total_count")
    _required_non_negative_int(estimate.available_count, f"{field_name}.available_count")
    _optional_non_negative_int(estimate.estimated_wait_minutes, f"{field_name}.estimated_wait_minutes")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_queue_estimate_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-queue-estimate-fields.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report queue estimate fields"
```

Expected: one local commit. Do not push or upload.
