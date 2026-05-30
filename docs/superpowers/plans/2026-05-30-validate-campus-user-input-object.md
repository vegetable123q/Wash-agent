# Validate Campus User Input Object Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `build_campus_context_from_user_input()` reject non-object user input with a clear error.

**Architecture:** Add the same `user_inputs must be an object` check used by `build_campus_context()` before copying `user_inputs` in the higher-level campus context entrypoint.

**Tech Stack:** Python input validation, `unittest`, `uv`.

---

### Task 1: Validate high-level campus user input shape

**Files:**
- Modify: `tests/test_campus_context.py`
- Modify: `backend/campus/context.py`

- [x] **Step 1: Write the failing test**

Add:

```python
def test_build_campus_context_from_user_input_requires_object_input(self) -> None:
    for user_inputs in (None, "tower", [("tower_key", "nq21")]):
        with self.subTest(user_inputs=user_inputs):
            with self.assertRaisesRegex(ValueError, "user_inputs must be an object"):
                build_campus_context_from_user_input(user_inputs)  # type: ignore[arg-type]
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_campus_context.CampusContextTests.test_build_campus_context_from_user_input_requires_object_input -v`

Expected: FAIL because the entrypoint currently raises lower-level errors or accepts iterable pairs.

- [x] **Step 3: Write minimal implementation**

At the top of `build_campus_context_from_user_input()`:

```python
if not isinstance(user_inputs, dict):
    raise ValueError("user_inputs must be an object")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_campus_context.CampusContextTests.test_build_campus_context_from_user_input_requires_object_input -v`

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
git add docs/superpowers/plans/2026-05-30-validate-campus-user-input-object.md tests/test_campus_context.py backend/campus/context.py
git commit -m "fix: validate campus user input object"
```

Expected: one local commit. Do not push or upload.
