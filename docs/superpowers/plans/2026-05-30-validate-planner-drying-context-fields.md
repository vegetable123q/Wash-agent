# Validate Planner Drying Context Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `plan_laundry` reject malformed drying context values before they affect air-dry warnings.

**Architecture:** Add the same focused drying context field validation to `backend/laundry/planner.py` that report generation already uses.

**Tech Stack:** Python validation, `unittest`, `uv`.

---

### Task 1: Validate planner drying context fields

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add `test_plan_requires_valid_drying_context_fields` near the other plan context validation tests:

```python
def test_plan_requires_valid_drying_context_fields(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    invalid_contexts = [
        ("balcony_available", {"balcony_available": "yes"}),
        ("balcony_available", {"balcony_available": 1}),
        ("ventilation", {"ventilation": True}),
        ("ventilation", {"ventilation": ""}),
    ]

    for field_name, drying_context in invalid_contexts:
        with self.subTest(field_name=field_name, drying_context=drying_context):
            context = _campus_context()
            context.drying_context = drying_context

            with self.assertRaisesRegex(ValueError, field_name):
                plan_laundry(
                    items,
                    LaundryConstraints(selected_item_ids=["white-tee"], allow_dryer=False),
                    context,
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_drying_context_fields -v`

Expected: FAIL because malformed drying values are currently accepted by planning.

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

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_drying_context_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-planner-drying-context-fields.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate planner drying context fields"
```

Expected: one local commit. Do not push or upload.
