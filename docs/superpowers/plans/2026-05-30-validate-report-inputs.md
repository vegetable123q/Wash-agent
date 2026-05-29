# Validate Report Inputs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed top-level inputs with explicit `ValueError` messages before report internals access plan, item, or campus fields.

**Architecture:** Add small validation helpers at the top of `backend/reports/generator.py`. Keep the report formatting logic unchanged.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Validate generate_report inputs

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing tests**

Add tests near the existing report generation test:

```python
def test_report_requires_laundry_plan(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    with self.assertRaisesRegex(ValueError, "plan"):
        generate_report(
            object(),  # type: ignore[arg-type]
            items,
            _campus_context(),
        )

def test_report_requires_wardrobe_item_list(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())

    invalid_items: list[object] = ["items", [object()]]
    for report_items in invalid_items:
        with self.subTest(report_items=report_items):
            with self.assertRaisesRegex(ValueError, "items"):
                generate_report(
                    plan,
                    report_items,  # type: ignore[arg-type]
                    _campus_context(),
                )

def test_report_requires_campus_context(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())

    invalid_contexts: list[object] = [None, object(), {"available_machines": []}]
    for campus_context in invalid_contexts:
        with self.subTest(campus_context=campus_context):
            with self.assertRaisesRegex(ValueError, "campus_context"):
                generate_report(
                    plan,
                    items,
                    campus_context,  # type: ignore[arg-type]
                )
```

- [x] **Step 2: Run tests to verify they fail**

Run:

```bash
uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_laundry_plan tests.test_e_module.EModuleTests.test_report_requires_wardrobe_item_list tests.test_e_module.EModuleTests.test_report_requires_campus_context -v
```

Expected: FAIL because malformed report inputs currently reach internals and raise unrelated errors or pass silently.

- [x] **Step 3: Write minimal implementation**

At the top of `generate_report`, call:

```python
_validate_plan(plan)
_validate_items(items)
_validate_campus_context(campus_context)
```

Add helpers requiring `LaundryPlan`, list of `WardrobeItem`, and `CampusContext`.

- [x] **Step 4: Run tests to verify they pass**

Run the same target test command from Step 2.

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
git add docs/superpowers/plans/2026-05-30-validate-report-inputs.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report inputs"
```

Expected: one local commit. Do not push or upload.
