# Validate Planner Constraints Object Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make laundry planning reject malformed `constraints` inputs before planner internals access constraint fields.

**Architecture:** Keep validation at the `plan_laundry` entry point path by strengthening `_validate_constraints` in `backend/laundry/planner.py`. The helper should first require a `LaundryConstraints` object, then continue validating individual fields as it already does.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject malformed planner constraints object

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing planner input validation tests:

```python
def test_plan_requires_laundry_constraints(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    invalid_constraints: list[object] = [None, object(), {"selected_item_ids": ["white-tee"]}]

    for constraints in invalid_constraints:
        with self.subTest(constraints=constraints):
            with self.assertRaisesRegex(ValueError, "constraints"):
                plan_laundry(
                    items,
                    constraints,  # type: ignore[arg-type]
                    _campus_context(),
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_laundry_constraints -v`

Expected: FAIL because malformed `constraints` currently reaches field access and can raise unrelated errors.

- [x] **Step 3: Write minimal implementation**

At the top of `_validate_constraints`, add:

```python
if not isinstance(constraints, LaundryConstraints):
    raise ValueError("constraints must be LaundryConstraints")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_laundry_constraints -v`

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
git add docs/superpowers/plans/2026-05-30-validate-planner-constraints-object.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate planner constraints object"
```

Expected: one local commit. Do not push or upload.
