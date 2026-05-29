# Preferred Method Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return explicit `preferred_method` validation errors when stored wardrobe item wash methods are malformed.

**Architecture:** Add a `_wash_method` helper in `backend/wardrobe/store.py` that requires a non-empty string and wraps enum conversion errors with the field name. Use it for wardrobe item `preferred_method`.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed preferred methods

**Files:**
- Modify: `tests/test_c_module.py`

- [ ] **Step 1: Write the failing test**

Add this test near the other store validation tests:

```python
    def test_store_rejects_invalid_preferred_method(self) -> None:
        invalid_methods: list[object] = [True, 123, "", "steam"]
        for method in invalid_methods:
            with self.subTest(method=method):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][0]["preferred_method"] = method
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "preferred_method"):
                    self.store.list_items()
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_preferred_method -v
```

Expected: FAIL because current enum conversion errors do not include `preferred_method`.

### Task 2: Add wash-method validator

**Files:**
- Modify: `backend/wardrobe/store.py`

- [ ] **Step 1: Add helper near the scalar validators**

```python
def _wash_method(value: Any, field_name: str) -> WashMethod:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} must be a valid wash method")
    try:
        return WashMethod(value)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a valid wash method") from exc
```

- [ ] **Step 2: Use helper in `_wardrobe_item_from_dict`**

Replace:

```python
        preferred_method=WashMethod(data["preferred_method"]),
```

with:

```python
        preferred_method=_wash_method(data["preferred_method"], "preferred_method"),
```

- [ ] **Step 3: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_preferred_method -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/wardrobe/store.py`
- Modify: `tests/test_c_module.py`
- Create: `docs/superpowers/plans/2026-05-30-validate-preferred-method.md`

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
git add docs/superpowers/plans/2026-05-30-validate-preferred-method.md backend/wardrobe/store.py tests/test_c_module.py
git commit -m "fix: validate preferred wash method"
```

Expected: A local commit is created. Do not push or upload.
