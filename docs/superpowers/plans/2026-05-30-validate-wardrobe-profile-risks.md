# Wardrobe Profile Risks Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Return explicit `risks` validation errors when stored wardrobe profile risk data is malformed.

**Architecture:** Add a focused `_risk_map` validator in `backend/wardrobe/store.py`. It accepts missing or null risks as empty, requires object-shaped risks otherwise, validates string keys, and wraps invalid `RiskLevel` values with field-specific `ValueError`s.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed stored risks

**Files:**
- Modify: `tests/test_c_module.py`

- [ ] **Step 1: Write the failing test**

Add this test near the other store validation tests:

```python
    def test_store_rejects_invalid_profile_risks(self) -> None:
        invalid_risks: list[object] = [
            True,
            ["shrink"],
            {"shrink": True},
            {"shrink": "extreme"},
            {"": "low"},
        ]
        for risks in invalid_risks:
            with self.subTest(risks=risks):
                payload = json.loads(self.path.read_text(encoding="utf-8"))
                payload["items"][0]["profile"]["risks"] = risks
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, "risks"):
                    self.store.list_items()
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_risks -v
```

Expected: FAIL or ERROR because current code calls `dict(...)` and `RiskLevel(...)` without wrapping errors with the `risks` field name.

### Task 2: Add risks validator

**Files:**
- Modify: `backend/wardrobe/store.py`

- [ ] **Step 1: Add helper near `_profile_from_dict`**

```python
def _risk_map(value: Any) -> dict[str, RiskLevel]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError("risks must be an object")
    risks: dict[str, RiskLevel] = {}
    for key, item_value in value.items():
        if not isinstance(key, str) or not key.strip():
            raise ValueError("risks must contain non-empty string keys")
        try:
            risks[key.strip()] = RiskLevel(item_value)
        except ValueError as exc:
            raise ValueError(f"risks.{key} must be a valid risk level") from exc
    return risks
```

- [ ] **Step 2: Use helper in `_profile_from_dict`**

Replace the dict comprehension for `cleaned["risks"]` with:

```python
    cleaned["risks"] = _risk_map(cleaned.get("risks"))
```

- [ ] **Step 3: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_risks -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/wardrobe/store.py`
- Modify: `tests/test_c_module.py`
- Create: `docs/superpowers/plans/2026-05-30-validate-wardrobe-profile-risks.md`

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
git add docs/superpowers/plans/2026-05-30-validate-wardrobe-profile-risks.md backend/wardrobe/store.py tests/test_c_module.py
git commit -m "fix: validate wardrobe profile risks"
```

Expected: A local commit is created. Do not push or upload.
