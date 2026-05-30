# Validate Report Campus Context Maps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed `CampusContext` mapping fields before report rendering.

**Architecture:** Match the planner boundary by adding dict validation for `weather`, `drying_context`, and `pricing_rules` inside `backend/reports/generator.py`.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate campus context maps

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add `test_report_requires_valid_campus_context_maps` near the other report context validation tests:

```python
def test_report_requires_valid_campus_context_maps(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())
    invalid_contexts = [
        ("weather", CampusContext(weather=[])),  # type: ignore[arg-type]
        ("drying_context", CampusContext(drying_context=[])),  # type: ignore[arg-type]
        ("pricing_rules", CampusContext(pricing_rules=[])),  # type: ignore[arg-type]
    ]

    for field_name, campus_context in invalid_contexts:
        with self.subTest(field_name=field_name, campus_context=campus_context):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, campus_context)
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_campus_context_maps -v`

Expected: FAIL because these fields are currently accepted.

- [x] **Step 3: Write minimal implementation**

Update `_validate_campus_context`:

```python
_dict_field(value.weather, "weather")
_dict_field(value.drying_context, "drying_context")
_dict_field(value.pricing_rules, "pricing_rules")
```

Add helper:

```python
def _dict_field(value: object, field_name: str) -> None:
    if not isinstance(value, dict):
        raise ValueError(f"campus_context.{field_name} must be a dictionary")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_campus_context_maps -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-campus-context-maps.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report campus context maps"
```

Expected: one local commit. Do not push or upload.
