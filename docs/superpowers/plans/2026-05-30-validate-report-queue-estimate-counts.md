# Validate Report Queue Estimate Counts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed queue estimate count fields that are part of `MachineQueueEstimate`, even when they are not directly rendered in the report.

**Architecture:** Extend the existing `_validate_queue_estimate` helper in `backend/reports/generator.py` so report input validation matches the planning boundary for all queue estimate counters.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate queue estimate counters

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add these invalid cases to `test_report_requires_valid_queue_estimate_fields`:

```python
("running_count", invalid_context(running_count=True)),
("running_count", invalid_context(running_count=1.5)),
("running_count", invalid_context(running_count=-1)),
("out_of_service_count", invalid_context(out_of_service_count=True)),
("out_of_service_count", invalid_context(out_of_service_count=1.5)),
("out_of_service_count", invalid_context(out_of_service_count=-1)),
("unknown_count", invalid_context(unknown_count=True)),
("unknown_count", invalid_context(unknown_count=1.5)),
("unknown_count", invalid_context(unknown_count=-1)),
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_queue_estimate_fields -v`

Expected: FAIL because malformed count fields are currently accepted by report generation.

- [x] **Step 3: Write minimal implementation**

Update `_validate_queue_estimate`:

```python
_required_non_negative_int(estimate.running_count, f"{field_name}.running_count")
_required_non_negative_int(
    estimate.out_of_service_count,
    f"{field_name}.out_of_service_count",
)
_required_non_negative_int(estimate.unknown_count, f"{field_name}.unknown_count")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_queue_estimate_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-queue-estimate-counts.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report queue estimate counts"
```

Expected: one local commit. Do not push or upload.
