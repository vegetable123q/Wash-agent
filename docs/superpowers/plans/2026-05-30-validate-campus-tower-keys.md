# Validate Campus Tower Keys Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reject malformed `tower_keys` maps before campus context calls machine providers.

**Architecture:** Tighten `_optional_string_map` in `backend/campus/context.py` so keys and values must already be non-empty strings. This prevents booleans and other accidental values from being silently stringified into provider names or tower IDs.

**Tech Stack:** Python dict validation, `unittest`, `uv`.

---

### Task 1: Validate `tower_keys` entries

**Files:**
- Modify: `tests/test_campus_context.py`
- Modify: `backend/campus/context.py`

- [x] **Step 1: Write the failing test**

Add:

```python
def test_build_campus_context_rejects_non_string_tower_keys(self) -> None:
    client = FakeMachineClient([])
    invalid_maps: list[dict[object, object]] = [
        {True: "nq21"},
        {"cleverschool": True},
        {"cleverschool": 123},
    ]
    for tower_keys in invalid_maps:
        with self.subTest(tower_keys=tower_keys):
            with self.assertRaisesRegex(ValueError, "tower_keys"):
                build_campus_context(
                    client,
                    {"tower_name": "nq21", "tower_keys": tower_keys},
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_campus_context.CampusContextTests.test_build_campus_context_rejects_non_string_tower_keys -v`

Expected: FAIL because non-string entries are currently stringified.

- [x] **Step 3: Write minimal implementation**

Update `_optional_string_map`:

```python
if not isinstance(map_key, str) or not map_key.strip():
    raise ValueError(f"{key} must contain non-empty string keys and values")
if not isinstance(map_value, str) or not map_value.strip():
    raise ValueError(f"{key} must contain non-empty string keys and values")
normalized[map_key.strip()] = map_value.strip()
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_campus_context.CampusContextTests.test_build_campus_context_rejects_non_string_tower_keys -v`

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
git add docs/superpowers/plans/2026-05-30-validate-campus-tower-keys.md tests/test_campus_context.py backend/campus/context.py
git commit -m "fix: validate campus tower keys"
```

Expected: one local commit. Do not push or upload.
