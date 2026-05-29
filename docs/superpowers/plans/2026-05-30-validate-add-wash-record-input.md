# Validate Add Wash Record Input Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `WardrobeStore.add_wash_record` reject malformed `record` inputs before accessing `record.method` or writing invalid wash history.

**Architecture:** Add a helper that requires a `WashRecord`, serializes it with `_to_jsonable`, then reuses `_wash_record_from_dict` to validate and normalize the record before appending.

**Tech Stack:** Python dataclasses, JSON storage, `unittest`, `uv`.

---

### Task 1: Validate add_wash_record input

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add this test near existing wash-record mutation coverage:

```python
def test_add_wash_record_rejects_invalid_record_input(self) -> None:
    invalid_records: list[object] = [object(), "record"]
    for record in invalid_records:
        with self.subTest(record=record):
            with self.assertRaisesRegex(ValueError, "record"):
                self.store.add_wash_record(
                    "wm-white-tee-001",
                    record,  # type: ignore[arg-type]
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_add_wash_record_rejects_invalid_record_input -v`

Expected: FAIL because malformed records currently leak attribute errors.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _validated_wash_record(value: Any) -> WashRecord:
    if not isinstance(value, WashRecord):
        raise ValueError("record must be a WashRecord")
    record_dict = _to_jsonable(value)
    if not isinstance(record_dict, dict):
        raise ValueError("record must serialize to an object")
    return _wash_record_from_dict(record_dict)
```

Call it at the start of `add_wash_record`.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_add_wash_record_rejects_invalid_record_input -v`

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
git add docs/superpowers/plans/2026-05-30-validate-add-wash-record-input.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: validate wash record input"
```

Expected: one local commit. Do not push or upload.
