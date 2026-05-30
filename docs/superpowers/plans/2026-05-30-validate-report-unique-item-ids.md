# Validate Report Unique Item Ids Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject duplicate wardrobe item ids before building the report item-name map.

**Architecture:** Extend report-side item validation so duplicate `WardrobeItem.profile.item_id` values fail explicitly instead of being silently overwritten by the `item_names` dictionary.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate unique report item ids

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add `test_report_requires_unique_item_ids` near the report item validation tests:

```python
def test_report_requires_unique_item_ids(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())
    report_items = [
        _item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0}),
        _item("white-tee", "duplicate white tee", colors=["white"], materials={"cotton": 1.0}),
    ]

    with self.assertRaisesRegex(ValueError, "white-tee"):
        generate_report(plan, report_items, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_unique_item_ids -v`

Expected: FAIL because duplicate ids are currently accepted and the later item silently overwrites the name map entry.

- [x] **Step 3: Write minimal implementation**

Track seen ids in `_validate_items` after `_validate_item`:

```python
seen_item_ids: set[str] = set()
for index, item in enumerate(value):
    ...
    item_id = item.profile.item_id
    if item_id in seen_item_ids:
        raise ValueError(f"items duplicate item_id: {item_id}")
    seen_item_ids.add(item_id)
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_unique_item_ids -v`

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
git add docs/superpowers/plans/2026-05-30-validate-report-unique-item-ids.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report unique item ids"
```

Expected: one local commit. Do not push or upload.
