# Validate Planner ID Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make laundry planning reject malformed `selected_item_ids` and `urgent_item_ids` constraints before they reach missing-ID logic.

**Architecture:** Keep validation at the `plan_laundry` entry point in `backend/laundry/planner.py`. Add a small helper that accepts only `list[str]` with non-empty IDs, then reuse existing selection and urgent-item behavior.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject malformed planner item ID lists

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing constraint validation tests:

```python
def test_constraints_require_string_item_id_lists(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    invalid_values: list[object] = ["white-tee", [True], [123], [""]]

    for selected_item_ids in invalid_values:
        with self.subTest(field="selected_item_ids", value=selected_item_ids):
            with self.assertRaisesRegex(ValueError, "selected_item_ids"):
                plan_laundry(
                    items,
                    LaundryConstraints(selected_item_ids=selected_item_ids),  # type: ignore[arg-type]
                    _campus_context(),
                )

    for urgent_item_ids in invalid_values:
        with self.subTest(field="urgent_item_ids", value=urgent_item_ids):
            with self.assertRaisesRegex(ValueError, "urgent_item_ids"):
                plan_laundry(
                    items,
                    LaundryConstraints(selected_item_ids=["white-tee"], urgent_item_ids=urgent_item_ids),  # type: ignore[arg-type]
                    _campus_context(),
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_constraints_require_string_item_id_lists -v`

Expected: FAIL because malformed ID-list constraints currently fall through to missing-ID logic or type errors.

- [x] **Step 3: Write minimal implementation**

In `plan_laundry`, validate constraints before selecting items:

```python
_validate_constraints(constraints)
```

Add:

```python
def _validate_constraints(constraints: LaundryConstraints) -> None:
    _item_id_list(constraints.selected_item_ids, "selected_item_ids")
    _item_id_list(constraints.urgent_item_ids, "urgent_item_ids")


def _item_id_list(value: object, field_name: str) -> list[str]:
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list of non-empty strings")
    if not all(isinstance(item, str) and item.strip() for item in value):
        raise ValueError(f"{field_name} must be a list of non-empty strings")
    return value
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_constraints_require_string_item_id_lists -v`

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
git add docs/superpowers/plans/2026-05-30-validate-planner-id-lists.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate planner item id lists"
```

Expected: one local commit. Do not push or upload.
