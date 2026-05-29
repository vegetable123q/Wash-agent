# Validate Planner Search Fields Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `plan_laundry` reject malformed item fields before planner search text and material checks are assembled.

**Architecture:** Extend the existing planner `_validate_item` guard. Validate the profile fields consumed by `_search_text` and `_has_material`, plus `item.user_notes`, while preserving valid empty lists and empty `user_note`.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate planner search fields

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add this test near `test_plan_requires_valid_item_identity_fields`:

```python
def test_plan_requires_valid_item_search_fields(self) -> None:
    invalid_items = [
        ("user_note", WardrobeItem(profile=ClothingProfile(item_id="bad-note", name="white tee", user_note=True))),  # type: ignore[arg-type]
        ("material_ratios", WardrobeItem(profile=ClothingProfile(item_id="bad-materials", name="white tee", material_ratios="cotton"))),  # type: ignore[arg-type]
        ("material_ratios", WardrobeItem(profile=ClothingProfile(item_id="bad-material-keys", name="white tee", material_ratios={True: 1.0}))),  # type: ignore[dict-item]
        ("colors", WardrobeItem(profile=ClothingProfile(item_id="bad-colors", name="white tee", colors="white"))),  # type: ignore[arg-type]
        ("colors", WardrobeItem(profile=ClothingProfile(item_id="bad-colors", name="white tee", colors=[True]))),  # type: ignore[list-item]
        ("care_warnings", WardrobeItem(profile=ClothingProfile(item_id="bad-warnings", name="white tee", care_warnings=[True]))),  # type: ignore[list-item]
        ("care_recommendations", WardrobeItem(profile=ClothingProfile(item_id="bad-recommendations", name="white tee", care_recommendations=[True]))),  # type: ignore[list-item]
        ("care_forbidden", WardrobeItem(profile=ClothingProfile(item_id="bad-care", name="white tee", care_forbidden=[True]))),  # type: ignore[list-item]
        ("source_notes", WardrobeItem(profile=ClothingProfile(item_id="bad-source", name="white tee", source_notes=[True]))),  # type: ignore[list-item]
        ("user_notes", WardrobeItem(profile=ClothingProfile(item_id="bad-user-notes", name="white tee"), user_notes="note")),  # type: ignore[arg-type]
        ("user_notes", WardrobeItem(profile=ClothingProfile(item_id="bad-user-notes", name="white tee"), user_notes=[True])),  # type: ignore[list-item]
    ]

    for field_name, item in invalid_items:
        with self.subTest(field_name=field_name, item=item):
            with self.assertRaisesRegex(ValueError, field_name):
                plan_laundry(
                    [item],
                    LaundryConstraints(selected_item_ids=[item.profile.item_id]),
                    _campus_context(),
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_item_search_fields -v`

Expected: FAIL because malformed search fields currently leak downstream errors or are silently accepted.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _string(value: object, field_name: str) -> None:
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")


def _string_key_dict(value: object, field_name: str) -> None:
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be an object")
    if not all(isinstance(key, str) and key.strip() for key in value):
        raise ValueError(f"{field_name} must contain non-empty string keys")
```

Then update `_validate_item`:

```python
_string(item.profile.user_note, f"{field_name}.profile.user_note")
_string_key_dict(item.profile.material_ratios, f"{field_name}.profile.material_ratios")
_string_list(item.profile.colors, f"{field_name}.profile.colors")
_string_list(item.profile.care_warnings, f"{field_name}.profile.care_warnings")
_string_list(item.profile.care_recommendations, f"{field_name}.profile.care_recommendations")
_string_list(item.profile.care_forbidden, f"{field_name}.profile.care_forbidden")
_string_list(item.profile.source_notes, f"{field_name}.profile.source_notes")
_string_list(item.user_notes, f"{field_name}.user_notes")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_item_search_fields -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_e_module -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [ ] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-planner-search-fields.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate planner search fields"
```

Expected: one local commit. Do not push or upload.
