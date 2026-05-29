# Validate Frequency Profile Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frequency advice reject malformed `profile.item_id` and `profile.name` values before returning advice or inferring thresholds.

**Architecture:** Keep validation in `backend/wardrobe/frequency_advisor.py` beside the existing direct `WardrobeItem` guards. Add a reusable `_non_empty_string` helper and validate the two identity fields read by scoring and response construction.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate profile identity fields

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing frequency validation tests:

```python
def test_frequency_requires_valid_profile_identity_fields(self) -> None:
    invalid_profiles = [
        ("item.profile.item_id", ClothingProfile(item_id=True, name="cotton t-shirt")),  # type: ignore[arg-type]
        ("item.profile.item_id", ClothingProfile(item_id="", name="cotton t-shirt")),
        ("item.profile.name", ClothingProfile(item_id="bad-name", name=True)),  # type: ignore[arg-type]
        ("item.profile.name", ClothingProfile(item_id="bad-name", name="")),
    ]

    for field_name, profile in invalid_profiles:
        with self.subTest(field_name=field_name, profile=profile):
            item = WardrobeItem(profile=profile)

            with self.assertRaisesRegex(ValueError, field_name):
                advise_frequency(item, LaundryConstraints())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_profile_identity_fields -v`

Expected: FAIL because invalid identity fields are currently accepted or produce unrelated errors.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _non_empty_string(value: object, field_name: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} must be a non-empty string")
```

Then update `_validate_item`:

```python
def _validate_item(value: object) -> None:
    if not isinstance(value, WardrobeItem):
        raise ValueError("item must be a WardrobeItem")
    if not isinstance(value.profile, ClothingProfile):
        raise ValueError("item.profile must be a ClothingProfile")
    _non_empty_string(value.profile.item_id, "item.profile.item_id")
    _non_empty_string(value.profile.name, "item.profile.name")
    _non_negative_int(value.wear_count_since_wash, "wear_count_since_wash")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_profile_identity_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-frequency-profile-identity.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py
git commit -m "fix: validate frequency profile identity"
```

Expected: one local commit. Do not push or upload.
