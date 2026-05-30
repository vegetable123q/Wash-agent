# Normalize Drying Balcony Alias Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make campus context builder treat legacy/user-facing `drying_context.has_balcony` as an alias for the canonical `drying_context.balcony_available` consumed by planning and reporting.

**Architecture:** Normalize the merged drying context in `backend/campus/context.py` after rules and user input are combined. Preserve the legacy key while setting the canonical key, so older callers still see their original field and downstream E-module code receives the expected field.

**Tech Stack:** Python dict normalization, `unittest`, `uv`.

---

### Task 1: Normalize balcony alias

**Files:**
- Modify: `tests/test_campus_context.py`
- Modify: `backend/campus/context.py`

- [x] **Step 1: Write the failing test**

Add `test_build_campus_context_normalizes_has_balcony_alias`:

```python
def test_build_campus_context_normalizes_has_balcony_alias(self) -> None:
    client = FakeMachineClient([])
    with tempfile.TemporaryDirectory() as tmp_dir:
        context = build_campus_context(
            client,
            {
                "tower_key": "ncrkiz1",
                "tower_provider": "cleverschool",
                "drying_context": {"has_balcony": False},
            },
            machine_rules_path=_write_rules(tmp_dir),
        )

    self.assertEqual(
        context.drying_context,
        {"has_balcony": False, "balcony_available": False},
    )
```

Update existing exact `drying_context` expectations that pass `has_balcony` to include `balcony_available`.

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_campus_context.CampusContextTests.test_build_campus_context_normalizes_has_balcony_alias -v`

Expected: FAIL because `balcony_available` is not currently populated from `has_balcony`.

- [x] **Step 3: Write minimal implementation**

Wrap drying context merge:

```python
drying_context = _normalize_drying_context(
    {
        **_rules_drying_context(rules_path),
        **_optional_object(inputs, "drying_context"),
    }
)
```

Add:

```python
def _normalize_drying_context(value: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(value)
    if "has_balcony" in normalized:
        normalized["balcony_available"] = normalized["has_balcony"]
    return normalized
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_campus_context.CampusContextTests.test_build_campus_context_normalizes_has_balcony_alias -v`

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
git add docs/superpowers/plans/2026-05-30-normalize-drying-balcony-alias.md tests/test_campus_context.py backend/campus/context.py
git commit -m "fix: normalize drying balcony alias"
```

Expected: one local commit. Do not push or upload.
