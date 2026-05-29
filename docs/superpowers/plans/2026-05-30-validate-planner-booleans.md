# Validate Planner Boolean Constraints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make laundry planning reject malformed boolean constraints before Python truthiness changes planner behavior.

**Architecture:** Extend `backend/laundry/planner.py` entry-point constraint validation. Add a tiny `_boolean` helper and validate `allow_mixed_colors`, `allow_dryer`, and `hygiene_sensitive` before bucket and drying decisions run.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject malformed planner boolean constraints

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing constraint validation tests:

```python
def test_constraints_require_boolean_flags(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    invalid_values: list[object] = ["true", 1, None]

    for field_name in ("allow_mixed_colors", "allow_dryer", "hygiene_sensitive"):
        for value in invalid_values:
            with self.subTest(field_name=field_name, value=value):
                constraints = LaundryConstraints(selected_item_ids=["white-tee"])
                setattr(constraints, field_name, value)

                with self.assertRaisesRegex(ValueError, field_name):
                    plan_laundry(items, constraints, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_constraints_require_boolean_flags -v`

Expected: FAIL because malformed boolean constraints currently use Python truthiness.

- [x] **Step 3: Write minimal implementation**

In `_validate_constraints`, add:

```python
_boolean(constraints.allow_mixed_colors, "allow_mixed_colors")
_boolean(constraints.allow_dryer, "allow_dryer")
_boolean(constraints.hygiene_sensitive, "hygiene_sensitive")
```

Add:

```python
def _boolean(value: object, field_name: str) -> bool:
    if not isinstance(value, bool):
        raise ValueError(f"{field_name} must be a boolean")
    return value
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_constraints_require_boolean_flags -v`

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
git add docs/superpowers/plans/2026-05-30-validate-planner-booleans.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate planner boolean constraints"
```

Expected: one local commit. Do not push or upload.
