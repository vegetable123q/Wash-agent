# Wash Record Method Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return explicit `method` validation errors when stored wash-history record methods are malformed.

**Architecture:** Reuse the existing `_wash_method` helper for `WashRecord.method`. The `_wash_history` wrapper will preserve the record path while the helper supplies the method field name.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed wash record methods

**Files:**
- Modify: `tests/test_c_module.py`

- [ ] **Step 1: Write the failing test**

Add this test near the other wash-record validation tests:

```python
    def test_store_rejects_invalid_wash_record_method(self) -> None:
        invalid_methods: list[object] = [True, 123, "", "steam"]
        for method in invalid_methods:
            with self.subTest(method=method):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][2]["wash_history"][0]["method"] = method
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "method"):
                    self.store.list_items()
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_wash_record_method -v
```

Expected: FAIL because current enum conversion error does not include lowercase `method`.

### Task 2: Reuse wash-method validator

**Files:**
- Modify: `backend/wardrobe/store.py`

- [ ] **Step 1: Use helper in `_wash_record_from_dict`**

Replace:

```python
        method=WashMethod(data["method"]),
```

with:

```python
        method=_wash_method(data["method"], "method"),
```

- [ ] **Step 2: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_wash_record_method -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/wardrobe/store.py`
- Modify: `tests/test_c_module.py`
- Create: `docs/superpowers/plans/2026-05-30-validate-wash-record-method.md`

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
git add docs/superpowers/plans/2026-05-30-validate-wash-record-method.md backend/wardrobe/store.py tests/test_c_module.py
git commit -m "fix: validate wash record method"
```

Expected: A local commit is created. Do not push or upload.
