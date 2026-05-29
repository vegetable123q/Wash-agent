# Validate Frequency User Text Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frequency advice reject malformed user text fields before they are joined into search text.

**Architecture:** Keep direct `WardrobeItem` validation in `backend/wardrobe/frequency_advisor.py`. Validate `profile.user_note` as a string and `item.user_notes` as a list of strings, matching the store layer's accepted shapes.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate user text fields

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing frequency validation tests:

```python
def test_frequency_requires_valid_user_text_fields(self) -> None:
    valid_profile = ClothingProfile(item_id="text-item", name="cotton t-shirt")
    invalid_items = [
        ("item.profile.user_note", WardrobeItem(profile=ClothingProfile(item_id="bad-note", name="cotton t-shirt", user_note=True))),  # type: ignore[arg-type]
        ("user_notes", WardrobeItem(profile=valid_profile, user_notes="note")),  # type: ignore[arg-type]
        ("user_notes", WardrobeItem(profile=valid_profile, user_notes=[True])),  # type: ignore[list-item]
    ]

    for field_name, item in invalid_items:
        with self.subTest(field_name=field_name, item=item):
            with self.assertRaisesRegex(ValueError, field_name):
                advise_frequency(item, LaundryConstraints())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_user_text_fields -v`

Expected: FAIL because invalid text fields currently leak downstream `TypeError`.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _string(value: object, field_name: str) -> None:
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")


def _string_list(value: object, field_name: str) -> None:
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list of strings")
    if not all(isinstance(item, str) for item in value):
        raise ValueError(f"{field_name} must be a list of strings")
```

Then update `_validate_item`:

```python
_string(value.profile.user_note, "item.profile.user_note")
_string_list(value.user_notes, "user_notes")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_user_text_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-frequency-user-text.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py
git commit -m "fix: validate frequency user text"
```

Expected: one local commit. Do not push or upload.
