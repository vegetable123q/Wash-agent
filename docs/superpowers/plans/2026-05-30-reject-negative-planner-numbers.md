# Reject Negative Planner Numbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent laundry planning from accepting negative pricing or duration rule values.

**Architecture:** Keep the validation in the shared `_number` helper inside `backend/laundry/planner.py`, so wash and dryer price/duration rules use the same non-negative numeric boundary. Add one regression test through `plan_laundry`.

**Tech Stack:** Python 3, `unittest`, `uv`, existing E module planner tests.

---

### Task 1: Reject Negative Rule Values

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [ ] **Step 1: Write the failing test**

Add a test near `test_invalid_pricing_values_are_explicit_error`:

```python
def test_negative_pricing_values_are_explicit_error(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    context = _campus_context()
    context.pricing_rules["wash_programs"]["standard"]["price_yuan"] = -1

    with self.assertRaisesRegex(ValueError, "wash program standard price_yuan"):
        plan_laundry(
            items,
            LaundryConstraints(selected_item_ids=["white-tee"]),
            context,
        )
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_negative_pricing_values_are_explicit_error -v`

Expected: FAIL because current `_number` accepts negative values.

- [ ] **Step 3: Write the minimal implementation**

Update `_number` after the finite check:

```python
if number < 0:
    raise ValueError(f"{field_name} must be non-negative")
```

- [ ] **Step 4: Run focused tests to verify GREEN**

Run: `uv run python -m unittest tests.test_e_module -v`

Expected: all E module tests pass.

- [ ] **Step 5: Run full backend verification**

Run: `uv run python -m unittest discover -v`

Expected: all backend tests pass.

- [ ] **Step 6: Run whitespace check**

Run: `git diff --check`

Expected: exit code 0, ignoring harmless CRLF warnings if present.

- [ ] **Step 7: Commit local-only version**

```bash
git add docs/superpowers/plans/2026-05-30-reject-negative-planner-numbers.md backend/laundry/planner.py tests/test_e_module.py
git commit -m "fix: reject negative planner numbers"
```
