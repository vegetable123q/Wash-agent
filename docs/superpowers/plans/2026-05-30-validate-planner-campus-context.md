# Validate Planner Campus Context Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make laundry planning reject malformed `campus_context` inputs before planner internals access campus machine or pricing fields.

**Architecture:** Keep validation at the `plan_laundry` entry point in `backend/laundry/planner.py`. Add a small `_validate_campus_context` helper that accepts only `CampusContext` objects and reports a clear `ValueError`.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject malformed planner campus context

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing planner input validation tests:

```python
def test_plan_requires_campus_context(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    invalid_contexts: list[object] = [None, object(), {"available_machines": []}]

    for campus_context in invalid_contexts:
        with self.subTest(campus_context=campus_context):
            with self.assertRaisesRegex(ValueError, "campus_context"):
                plan_laundry(
                    items,
                    LaundryConstraints(selected_item_ids=["white-tee"]),
                    campus_context,  # type: ignore[arg-type]
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_campus_context -v`

Expected: FAIL because malformed `campus_context` currently reaches planner internals and can raise unrelated errors.

- [x] **Step 3: Write minimal implementation**

In `plan_laundry`, validate context before selection and bucket building:

```python
_validate_campus_context(campus_context)
```

Add:

```python
def _validate_campus_context(value: object) -> None:
    if not isinstance(value, CampusContext):
        raise ValueError("campus_context must be a CampusContext")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_campus_context -v`

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
git add docs/superpowers/plans/2026-05-30-validate-planner-campus-context.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate planner campus context"
```

Expected: one local commit. Do not push or upload.
