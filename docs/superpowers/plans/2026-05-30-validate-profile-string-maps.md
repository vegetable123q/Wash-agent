# Validate Profile String Maps Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wardrobe loading reject malformed optional `ClothingProfile` string-map fields before downstream extraction provenance and care-symbol logic reads them.

**Architecture:** Keep persisted profile validation in `backend/wardrobe/store.py`. Add a strict reusable `_string_map` helper for dict fields whose model contract is `dict[str, str]`, preserving empty defaults when fields are absent.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject malformed profile string maps

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing profile validation tests:

```python
def test_store_rejects_invalid_profile_string_maps(self) -> None:
    fields = [
        "user_fill_suggestions",
        "care_symbols",
        "care_symbol_evidence",
        "field_sources",
    ]
    invalid_values: list[object] = [True, ["entry"], {"": "value"}, {"key": True}, {"key": 123}]
    for field_name in fields:
        for value in invalid_values:
            with self.subTest(field_name=field_name, value=value):
                payload = json.loads((ROOT / "data" / "wardrobe_sample.json").read_text(encoding="utf-8"))
                payload["items"][0]["profile"][field_name] = value
                self.path.write_text(
                    json.dumps(payload, ensure_ascii=False),
                    encoding="utf-8",
                )

                with self.assertRaisesRegex(ValueError, field_name):
                    self.store.list_items()
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_string_maps -v`

Expected: FAIL because optional string-map fields currently load without strict validation.

- [x] **Step 3: Write minimal implementation**

In `_profile_from_dict`, validate optional string maps:

```python
for field_name in (
    "user_fill_suggestions",
    "care_symbols",
    "care_symbol_evidence",
    "field_sources",
):
    cleaned[field_name] = _string_map(cleaned.get(field_name), field_name)
```

Add:

```python
def _string_map(value: Any, field_name: str) -> dict[str, str]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be an object")
    items: dict[str, str] = {}
    for key, item_value in value.items():
        if not isinstance(key, str) or not key.strip():
            raise ValueError(f"{field_name} must contain non-empty string keys")
        if not isinstance(item_value, str):
            raise ValueError(f"{field_name}.{key} must be a string")
        items[key.strip()] = item_value
    return items
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_string_maps -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_c_module -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-profile-string-maps.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: validate profile string maps"
```

Expected: one local commit. Do not push or upload.
