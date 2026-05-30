# Validate Report Campus Machine Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed campus machine lists before rendering campus machine counts and locations.

**Architecture:** Extend `_validate_campus_context` in `backend/reports/generator.py` to validate `all_machines` and `available_machines` as lists of `MachineInfo`. This is the first campus-context report boundary pass; detailed `MachineInfo` field validation can remain a separate small iteration.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate campus machine list shape

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add this test after `test_report_requires_campus_context`:

```python
def test_report_requires_valid_campus_machine_lists(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())
    invalid_contexts = [
        ("all_machines", CampusContext(all_machines="machines")),
        (r"all_machines\[0\]", CampusContext(all_machines=[object()])),
        ("available_machines", CampusContext(available_machines="machines")),
        (r"available_machines\[0\]", CampusContext(available_machines=[object()])),
    ]

    for field_name, campus_context in invalid_contexts:
        with self.subTest(field_name=field_name, campus_context=campus_context):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, campus_context)
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_campus_machine_lists -v`

Expected: FAIL because malformed campus machine lists currently leak into report rendering or produce misleading counts.

- [x] **Step 3: Write minimal implementation**

Update `_validate_campus_context`:

```python
_machine_info_list(value.all_machines, "all_machines")
_machine_info_list(value.available_machines, "available_machines")
```

Add:

```python
def _machine_info_list(value: object, field_name: str) -> None:
    if not isinstance(value, list):
        raise ValueError(f"campus_context.{field_name} must be a list of MachineInfo")
    for index, machine in enumerate(value):
        if not isinstance(machine, MachineInfo):
            raise ValueError(f"campus_context.{field_name}[{index}] must be a MachineInfo")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_campus_machine_lists -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-campus-machine-lists.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report campus machine lists"
```

Expected: one local commit. Do not push or upload.
