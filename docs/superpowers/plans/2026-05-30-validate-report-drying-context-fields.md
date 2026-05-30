# Validate Report Drying Context Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed drying context values that would otherwise produce misleading drying summary text.

**Architecture:** Add a focused `_validate_drying_context` helper in `backend/reports/generator.py` and call it after confirming `campus_context.drying_context` is a dict.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate drying context fields

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add `test_report_requires_valid_drying_context_fields` near `test_report_requires_valid_campus_context_maps`:

```python
def test_report_requires_valid_drying_context_fields(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())
    invalid_contexts = [
        ("balcony_available", CampusContext(drying_context={"balcony_available": "yes"})),
        ("balcony_available", CampusContext(drying_context={"balcony_available": 1})),
        ("ventilation", CampusContext(drying_context={"ventilation": True})),
        ("ventilation", CampusContext(drying_context={"ventilation": ""})),
    ]

    for field_name, campus_context in invalid_contexts:
        with self.subTest(field_name=field_name, campus_context=campus_context):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, items, campus_context)
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_drying_context_fields -v`

Expected: FAIL because malformed drying context values are currently accepted.

- [x] **Step 3: Write minimal implementation**

Update `_validate_campus_context`:

```python
_validate_drying_context(value.drying_context)
```

Add:

```python
def _validate_drying_context(value: dict[str, object]) -> None:
    if "balcony_available" in value:
        _boolean(value["balcony_available"], "campus_context.drying_context.balcony_available")
    if "ventilation" in value:
        _non_empty_string(value["ventilation"], "campus_context.drying_context.ventilation")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_drying_context_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-drying-context-fields.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report drying context fields"
```

Expected: one local commit. Do not push or upload.
