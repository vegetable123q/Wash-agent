# Validate Campus Context Input Object Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `build_campus_context()` reject all non-object `user_inputs` values with the existing clear error while still allowing `None` as the default empty input.

**Architecture:** Replace the broad `user_inputs or {}` coalescing with an explicit `None` check, so falsey non-dict values like `""` and `[]` are validated instead of silently treated as `{}`.

**Tech Stack:** Python input validation, `unittest`, `uv`.

---

### Task 1: Validate low-level campus user input shape

**Files:**
- Modify: `tests/test_campus_context.py`
- Modify: `backend/campus/context.py`

- [x] **Step 1: Write the failing test**

Add a focused test near existing `build_campus_context` validation cases:

```python
def test_build_campus_context_rejects_non_object_user_inputs(self) -> None:
    client = FakeMachineClient([])

    for user_inputs in ("", [], [("tower_key", "nq21")]):
        with self.subTest(user_inputs=user_inputs):
            with self.assertRaisesRegex(ValueError, "user_inputs must be an object"):
                build_campus_context(client, user_inputs)  # type: ignore[arg-type]
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_campus_context.CampusContextTests.test_build_campus_context_rejects_non_object_user_inputs -v`

Expected: FAIL because falsey non-dict inputs are currently coerced to `{}` and raise a later `tower_key` error.

- [x] **Step 3: Write minimal implementation**

Change:

```python
inputs = user_inputs or {}
```

to:

```python
inputs = {} if user_inputs is None else user_inputs
```

Keep the existing `isinstance(inputs, dict)` guard.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_campus_context.CampusContextTests.test_build_campus_context_rejects_non_object_user_inputs -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_campus_context -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-campus-context-input-object.md tests/test_campus_context.py backend/campus/context.py
git commit -m "fix: validate campus context input object"
```

Expected: one local commit. Do not push or upload.
