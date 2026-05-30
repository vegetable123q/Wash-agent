# Validate Report Machine Metadata Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed `MachineInfo` metadata fields before rendering campus machine summaries.

**Architecture:** Extend report-side `_validate_machine_info` to validate the same `MachineInfo` metadata that the planner boundary validates: `status`, `remaining_minutes`, `price_yuan`, and `modes`.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate machine metadata

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Extend `test_report_requires_valid_campus_machine_fields` with these invalid cases:

```python
("status", invalid_context(status="available")),
("remaining_minutes", invalid_context(remaining_minutes=True)),
("remaining_minutes", invalid_context(remaining_minutes=1.5)),
("remaining_minutes", invalid_context(remaining_minutes=-1)),
("price_yuan", invalid_context(price_yuan=True)),
("price_yuan", invalid_context(price_yuan=float("nan"))),
("price_yuan", invalid_context(price_yuan=-1)),
("modes", invalid_context(modes="standard")),
("modes", invalid_context(modes=["standard", 1])),
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_campus_machine_fields -v`

Expected: FAIL because these metadata fields are currently accepted.

- [x] **Step 3: Write minimal implementation**

Import `MachineStatus` in `backend/reports/generator.py`, update `_validate_machine_info`, and add `_string_list`:

```python
_enum_field(machine.status, MachineStatus, f"{field_name}.status")
_optional_non_negative_int(machine.remaining_minutes, f"{field_name}.remaining_minutes")
_optional_non_negative_number(machine.price_yuan, f"{field_name}.price_yuan")
_string_list(machine.modes, f"{field_name}.modes")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_campus_machine_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-machine-metadata.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report machine metadata"
```

Expected: one local commit. Do not push or upload.
