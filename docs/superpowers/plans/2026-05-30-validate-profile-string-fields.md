# Validate Profile String Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wardrobe loading reject malformed optional `ClothingProfile` string fields, especially fields that feed downstream recommendation search text.

**Architecture:** Keep persisted profile validation in `backend/wardrobe/store.py`. Validate optional string fields only when present so missing fields still use dataclass defaults such as `material_evidence_level="unknown"`.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject malformed profile string fields

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing profile validation tests:

```python
def test_store_rejects_invalid_profile_string_fields(self) -> None:
    fields = [
        "user_note",
        "image_type",
        "material_evidence_level",
        "care_evidence_level",
        "recommended_wash",
        "extraction_status",
        "extraction_error",
    ]
    invalid_values: list[object] = [True, 123, ["text"]]
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

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_string_fields -v`

Expected: FAIL because optional string fields currently load without strict validation.

- [x] **Step 3: Write minimal implementation**

In `_profile_from_dict`, validate optional string fields only when present:

```python
for field_name in (
    "user_note",
    "image_type",
    "material_evidence_level",
    "care_evidence_level",
    "recommended_wash",
    "extraction_status",
    "extraction_error",
):
    if field_name in cleaned:
        cleaned[field_name] = _text(cleaned[field_name], field_name)
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_string_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-profile-string-fields.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: validate profile string fields"
```

Expected: one local commit. Do not push or upload.
