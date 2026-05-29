# Validate Frequency Constraints Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frequency advice reject malformed `LaundryConstraints` field values before they can affect priority scoring.

**Architecture:** Keep validation local to `backend/wardrobe/frequency_advisor.py`, mirroring the lightweight validators already used by `backend/laundry/planner.py`. Validate only the fields read by frequency advice: `urgent_item_ids` and `hygiene_sensitive`.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate frequency constraints fields

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing frequency validation tests:

```python
def test_frequency_requires_valid_constraints_fields(self) -> None:
    item = self.store.get_item("wm-white-tee-001")
    assert item is not None

    invalid_constraints = [
        ("urgent_item_ids", LaundryConstraints(urgent_item_ids="wm-white-tee-001")),  # type: ignore[arg-type]
        ("urgent_item_ids", LaundryConstraints(urgent_item_ids=[True])),  # type: ignore[list-item]
        ("urgent_item_ids", LaundryConstraints(urgent_item_ids=[""])),
        ("hygiene_sensitive", LaundryConstraints(hygiene_sensitive="yes")),  # type: ignore[arg-type]
        ("hygiene_sensitive", LaundryConstraints(hygiene_sensitive=1)),  # type: ignore[arg-type]
    ]

    for field_name, constraints in invalid_constraints:
        with self.subTest(field_name=field_name, constraints=constraints):
            with self.assertRaisesRegex(ValueError, field_name):
                advise_frequency(item, constraints)
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_constraints_fields -v`

Expected: FAIL because invalid field values are currently accepted or leak unrelated errors.

- [x] **Step 3: Write minimal implementation**

Add local validators:

```python
def _item_id_list(value: object, field_name: str) -> None:
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list of non-empty strings")
    if not all(isinstance(item, str) and item.strip() for item in value):
        raise ValueError(f"{field_name} must be a list of non-empty strings")


def _boolean(value: object, field_name: str) -> None:
    if not isinstance(value, bool):
        raise ValueError(f"{field_name} must be a boolean")
```

Then update `_validate_constraints`:

```python
def _validate_constraints(value: object) -> None:
    if not isinstance(value, LaundryConstraints):
        raise ValueError("constraints must be LaundryConstraints")
    _item_id_list(value.urgent_item_ids, "urgent_item_ids")
    _boolean(value.hygiene_sensitive, "hygiene_sensitive")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_constraints_fields -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_c_module -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [ ] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-frequency-constraints-fields.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py
git commit -m "fix: validate frequency constraints"
```

Expected: one local commit. Do not push or upload.
