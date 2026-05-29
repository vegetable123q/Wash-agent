# Validate Campus Context Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make laundry planning reject malformed fields inside a valid `CampusContext` object before planner internals access machine, queue, or mapping attributes.

**Architecture:** Extend `_validate_campus_context` in `backend/laundry/planner.py`. Keep this as a narrow entry-point guard: require machine fields to be lists of `MachineInfo`, queue estimates to be a list of `MachineQueueEstimate`, and context metadata fields to be dictionaries.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Validate CampusContext field shapes

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add this test near existing campus context validation coverage:

```python
def test_plan_requires_valid_campus_context_fields(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    cases: list[tuple[str, object, LaundryConstraints]] = [
        ("all_machines", [object()], LaundryConstraints(selected_item_ids=["white-tee"])),
        ("available_machines", [object()], LaundryConstraints(selected_item_ids=["white-tee"])),
        (
            "queue_estimates",
            [object()],
            LaundryConstraints(selected_item_ids=["white-tee"], max_wait_minutes=5),
        ),
        ("weather", [], LaundryConstraints(selected_item_ids=["white-tee"])),
        ("drying_context", [], LaundryConstraints(selected_item_ids=["white-tee"])),
        ("pricing_rules", [], LaundryConstraints(selected_item_ids=["white-tee"])),
    ]

    for field_name, value, constraints in cases:
        with self.subTest(field_name=field_name):
            context = _campus_context()
            setattr(context, field_name, value)

            with self.assertRaisesRegex(ValueError, field_name):
                plan_laundry(items, constraints, context)
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_campus_context_fields -v`

Expected: FAIL because some malformed fields currently pass silently or raise unrelated attribute errors.

- [x] **Step 3: Write minimal implementation**

Import `MachineQueueEstimate` into `backend/laundry/planner.py`, then update `_validate_campus_context`:

```python
_machine_info_list(value.all_machines, "all_machines")
_machine_info_list(value.available_machines, "available_machines")
_queue_estimate_list(value.queue_estimates, "queue_estimates")
_dict_field(value.weather, "weather")
_dict_field(value.drying_context, "drying_context")
_dict_field(value.pricing_rules, "pricing_rules")
```

Add small helpers that raise `ValueError(f"campus_context.{field_name} ...")` for wrong shapes.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_campus_context_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-campus-context-fields.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate campus context fields"
```

Expected: one local commit. Do not push or upload.
