# Validate Planner Profile Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `plan_laundry` reject malformed `profile.item_id` and `profile.name` values before selection and bucket planning.

**Architecture:** Extend the existing planner `_validate_item` guard. Reuse `_non_empty_string` so planner item validation follows the same style as existing machine field validation.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate planner profile identity fields

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add this test near `test_plan_requires_valid_item_profile`:

```python
def test_plan_requires_valid_item_identity_fields(self) -> None:
    invalid_items = [
        ("item_id", WardrobeItem(profile=ClothingProfile(item_id=True, name="white tee"))),  # type: ignore[arg-type]
        ("item_id", WardrobeItem(profile=ClothingProfile(item_id="", name="white tee"))),
        ("name", WardrobeItem(profile=ClothingProfile(item_id="bad-name", name=True))),  # type: ignore[arg-type]
        ("name", WardrobeItem(profile=ClothingProfile(item_id="bad-name", name=""))),
    ]

    for field_name, item in invalid_items:
        with self.subTest(field_name=field_name, item=item):
            with self.assertRaisesRegex(ValueError, field_name):
                plan_laundry(
                    [item],
                    LaundryConstraints(selected_item_ids=["bad-name"]),
                    _campus_context(),
                )
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_item_identity_fields -v`

Expected: FAIL because invalid identity fields currently produce selection errors or downstream type errors.

- [x] **Step 3: Write minimal implementation**

Update `_validate_item`:

```python
def _validate_item(item: WardrobeItem, field_name: str) -> None:
    if not isinstance(item.profile, ClothingProfile):
        raise ValueError(f"{field_name}.profile must be a ClothingProfile")
    _non_empty_string(item.profile.item_id, f"{field_name}.profile.item_id")
    _non_empty_string(item.profile.name, f"{field_name}.profile.name")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_item_identity_fields -v`

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
git add docs/superpowers/plans/2026-05-30-validate-planner-profile-identity.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate planner profile identity"
```

Expected: one local commit. Do not push or upload.
