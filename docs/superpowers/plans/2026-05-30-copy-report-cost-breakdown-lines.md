# Copy Report Cost Breakdown Lines Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent mutations to `WashReport.cost_breakdown` entries from mutating the source `LaundryPlan.cost_breakdown` entries.

**Architecture:** Keep the existing report shape, but copy each `LaundryChargeLine` when constructing `WashReport`.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Copy cost breakdown entries

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add `test_report_cost_breakdown_lines_are_copied` near `test_report_describes_plan_without_mutating_it`:

```python
def test_report_cost_breakdown_lines_are_copied(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())

    report = generate_report(plan, items, _campus_context())
    report.cost_breakdown[0].amount_yuan = 99.0

    self.assertEqual(plan.cost_breakdown[0].amount_yuan, 4.0)
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_cost_breakdown_lines_are_copied -v`

Expected: FAIL because report and plan currently share the same `LaundryChargeLine` objects.

- [x] **Step 3: Write minimal implementation**

Import `replace` from `dataclasses` and update `generate_report`:

```python
cost_breakdown=[replace(line) for line in plan.cost_breakdown],
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_cost_breakdown_lines_are_copied -v`

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
git add docs/superpowers/plans/2026-05-30-copy-report-cost-breakdown-lines.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: copy report cost breakdown lines"
```

Expected: one local commit. Do not push or upload.
