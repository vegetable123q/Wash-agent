# Validate Campus Machine Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make laundry planning reject malformed fields inside `MachineInfo` objects before bad machine IDs, locations, status values, or modes reach plan output.

**Architecture:** Extend the existing campus context validation path in `backend/laundry/planner.py`. `_machine_info_list` should continue checking list shape, then delegate each `MachineInfo` object to a focused field validator.

**Tech Stack:** Python dataclasses, enums, `unittest`, `uv`.

---

### Task 1: Validate MachineInfo field shapes

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing campus context validation tests:

```python
def test_plan_requires_valid_campus_machine_fields(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    cases: list[tuple[str, object]] = [
        ("machine_id", True),
        ("machine_id", " "),
        ("location", None),
        ("machine_type", "washer"),
        ("status", "available"),
        ("remaining_minutes", True),
        ("remaining_minutes", -1),
        ("price_yuan", True),
        ("price_yuan", float("nan")),
        ("modes", "standard"),
        ("modes", ["standard", 1]),
    ]

    for field_name, value in cases:
        with self.subTest(field_name=field_name, value=value):
            context = _campus_context()
            setattr(context.available_machines[0], field_name, value)

            with self.assertRaisesRegex(ValueError, field_name):
                plan_laundry(
                    items,
                    LaundryConstraints(selected_item_ids=["white-tee"]),
                    context,
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_campus_machine_fields -v`

Expected: FAIL because malformed `MachineInfo` fields currently pass silently or raise unrelated errors.

- [x] **Step 3: Write minimal implementation**

Update `_machine_info_list` to call `_validate_machine_info(item, f"campus_context.{field_name}[{index}]")`.

Add helpers for:
- non-empty string fields: `machine_id`, `location`
- enum fields: `machine_type`, `status`
- optional non-negative numeric fields: `remaining_minutes`, `price_yuan`
- list of non-empty strings: `modes`

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_campus_machine_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-campus-machine-fields.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate campus machine fields"
```

Expected: one local commit. Do not push or upload.
