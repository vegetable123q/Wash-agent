# Validate Frequency Profile Search Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frequency advice reject malformed profile collection fields before search text is assembled.

**Architecture:** Keep direct `WardrobeItem` validation in `backend/wardrobe/frequency_advisor.py`. Validate the collection fields read by `_search_text`: `material_ratios` keys, `colors`, `care_forbidden`, and `source_notes`.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate profile search collections

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing frequency validation tests:

```python
def test_frequency_requires_valid_profile_search_fields(self) -> None:
    invalid_profiles = [
        ("item.profile.material_ratios", ClothingProfile(item_id="bad-materials", name="cotton t-shirt", material_ratios="cotton")),  # type: ignore[arg-type]
        ("item.profile.material_ratios", ClothingProfile(item_id="bad-material-keys", name="cotton t-shirt", material_ratios={True: 1.0})),  # type: ignore[dict-item]
        ("item.profile.colors", ClothingProfile(item_id="bad-colors", name="cotton t-shirt", colors="white")),  # type: ignore[arg-type]
        ("item.profile.colors", ClothingProfile(item_id="bad-colors", name="cotton t-shirt", colors=[True])),  # type: ignore[list-item]
        ("item.profile.care_forbidden", ClothingProfile(item_id="bad-care", name="cotton t-shirt", care_forbidden=[True])),  # type: ignore[list-item]
        ("item.profile.source_notes", ClothingProfile(item_id="bad-source", name="cotton t-shirt", source_notes=[True])),  # type: ignore[list-item]
    ]

    for field_name, profile in invalid_profiles:
        with self.subTest(field_name=field_name, profile=profile):
            item = WardrobeItem(profile=profile)

            with self.assertRaisesRegex(ValueError, field_name):
                advise_frequency(item, LaundryConstraints())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_profile_search_fields -v`

Expected: FAIL because malformed collection fields currently leak downstream errors or are silently accepted.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _string_key_dict(value: object, field_name: str) -> None:
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be an object")
    if not all(isinstance(key, str) and key.strip() for key in value):
        raise ValueError(f"{field_name} must contain non-empty string keys")
```

Then update `_validate_item`:

```python
_string_key_dict(value.profile.material_ratios, "item.profile.material_ratios")
_string_list(value.profile.colors, "item.profile.colors")
_string_list(value.profile.care_forbidden, "item.profile.care_forbidden")
_string_list(value.profile.source_notes, "item.profile.source_notes")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_profile_search_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-frequency-profile-search-fields.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py
git commit -m "fix: validate frequency profile search fields"
```

Expected: one local commit. Do not push or upload.
