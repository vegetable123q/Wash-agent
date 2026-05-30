# Validate Report Campus Machine Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed `MachineInfo` fields before rendering campus machine locations and type labels.

**Architecture:** Extend the report generator's campus-context validation by adding `_validate_machine_info` and calling it from `_machine_info_list`. Validate the fields used by report rendering: `machine_id`, `location`, and `machine_type`.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate campus machine fields

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add this test after `test_report_requires_valid_campus_machine_lists`:

```python
def test_report_requires_valid_campus_machine_fields(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())

    def invalid_context(**overrides: object) -> CampusContext:
        machine_values = {
            "machine_id": "washer-1",
            "location": "Dorm 1F",
            "machine_type": MachineType.STANDARD_WASHER,
            "status": MachineStatus.AVAILABLE,
        }
        machine_values.update(overrides)
        return CampusContext(
            available_machines=[MachineInfo(**machine_values)],  # type: ignore[arg-type]
        )

    invalid_contexts = [
        ("machine_id", invalid_context(machine_id=True)),
        ("machine_id", invalid_context(machine_id="")),
        ("location", invalid_context(location=True)),
        ("location", invalid_context(location="")),
        ("machine_type", invalid_context(machine_type="standard_washer")),
    ]

    for field_name, campus_context in invalid_contexts:
        with self.subTest(field_name=field_name, campus_context=campus_context):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, campus_context)
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_campus_machine_fields -v`

Expected: FAIL because malformed `MachineInfo` fields currently render incorrectly or rely on enum-string behavior.

- [x] **Step 3: Write minimal implementation**

Update `_machine_info_list`:

```python
_validate_machine_info(machine, f"campus_context.{field_name}[{index}]")
```

Add:

```python
def _validate_machine_info(machine: MachineInfo, field_name: str) -> None:
    _non_empty_string(machine.machine_id, f"{field_name}.machine_id")
    _non_empty_string(machine.location, f"{field_name}.location")
    _enum_field(machine.machine_type, MachineType, f"{field_name}.machine_type")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_campus_machine_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-campus-machine-fields.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report campus machine fields"
```

Expected: one local commit. Do not push or upload.
