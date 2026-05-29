# Reject Invalid Planner Pricing Numbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent laundry planning from accepting boolean, NaN, or infinite pricing and duration rule values.

**Architecture:** The planner funnels wash and dryer pricing rule values through `_number` in `backend/laundry/planner.py`. Add a regression test through `plan_laundry`, then update `_number` to reject booleans and non-finite floats.

**Tech Stack:** Python 3, `unittest`, `uv`, existing E module planner tests.

---

### Task 1: Reject Invalid Numeric Pricing Rules

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [ ] **Step 1: Write the failing test**

Add a test near the existing missing pricing data test:

```python
def test_invalid_pricing_values_are_explicit_error(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    invalid_prices: list[object] = [True, float("nan"), float("inf")]
    for price in invalid_prices:
        with self.subTest(price=price):
            context = _campus_context()
            context.pricing_rules["wash_programs"]["standard"]["price_yuan"] = price

            with self.assertRaisesRegex(ValueError, "wash program standard price_yuan"):
                plan_laundry(
                    items,
                    LaundryConstraints(selected_item_ids=["white-tee"]),
                    context,
                )
```

- [ ] **Step 2: Run the focused test to verify RED**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_invalid_pricing_values_are_explicit_error -v`

Expected: FAIL because current `_number` accepts booleans and non-finite floats.

- [ ] **Step 3: Write the minimal implementation**

Import `math` and update `_number`:

```python
def _number(value: object, field_name: str) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise ValueError(f"{field_name} must be numeric")
    number = float(value)
    if not math.isfinite(number):
        raise ValueError(f"{field_name} must be finite")
    return number
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
git add docs/superpowers/plans/2026-05-30-reject-invalid-planner-pricing-numbers.md backend/laundry/planner.py tests/test_e_module.py
git commit -m "fix: reject invalid planner pricing numbers"
```
