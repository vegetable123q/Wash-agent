# Wash History Shape Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return explicit `wash_history` validation errors when stored wardrobe wash-history data is malformed.

**Architecture:** Add a `_wash_history` helper in `backend/wardrobe/store.py`. It validates that the field is a list, validates each record is an object, and prefixes nested record validation errors with the record path.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed wash history shape

**Files:**
- Modify: `tests/test_c_module.py`

- [ ] **Step 1: Write the failing test**

Add this test near the other store validation tests:

```python
    def test_store_rejects_invalid_wash_history_shape(self) -> None:
        invalid_histories: list[object] = ["not-a-list", [True], [123]]
        for wash_history in invalid_histories:
            with self.subTest(wash_history=wash_history):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][0]["wash_history"] = wash_history
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "wash_history"):
                    self.store.list_items()
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_wash_history_shape -v
```

Expected: FAIL or ERROR because current code iterates malformed values without a `wash_history` field-specific error.

### Task 2: Add wash-history validator

**Files:**
- Modify: `backend/wardrobe/store.py`

- [ ] **Step 1: Add helper near `_wash_record_from_dict`**

```python
def _wash_history(value: Any) -> list[WashRecord]:
    if not isinstance(value, list):
        raise ValueError("wash_history must be a list")
    records: list[WashRecord] = []
    for index, record in enumerate(value):
        if not isinstance(record, dict):
            raise ValueError(f"wash_history[{index}] must be an object")
        try:
            records.append(_wash_record_from_dict(record))
        except ValueError as exc:
            raise ValueError(f"wash_history[{index}].{exc}") from exc
    return records
```

- [ ] **Step 2: Use helper in `_wardrobe_item_from_dict`**

Replace:

```python
        wash_history=[_wash_record_from_dict(record) for record in data["wash_history"]],
```

with:

```python
        wash_history=_wash_history(data["wash_history"]),
```

- [ ] **Step 3: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_wash_history_shape -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/wardrobe/store.py`
- Modify: `tests/test_c_module.py`
- Create: `docs/superpowers/plans/2026-05-30-validate-wash-history-shape.md`

- [ ] **Step 1: Run C module tests**

```bash
uv run python -m unittest tests.test_c_module -v
```

Expected: PASS.

- [ ] **Step 2: Run full backend test suite**

```bash
uv run python -m unittest discover -v
```

Expected: PASS.

- [ ] **Step 3: Check patch formatting**

```bash
git diff --check
```

Expected: exit code 0. CRLF warnings are acceptable on Windows.

- [ ] **Step 4: Commit locally only**

```bash
git add docs/superpowers/plans/2026-05-30-validate-wash-history-shape.md backend/wardrobe/store.py tests/test_c_module.py
git commit -m "fix: validate wash history shape"
```

Expected: A local commit is created. Do not push or upload.
