# Validate Report Item Identity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `generate_report` reject malformed report item profiles and identity fields before report sections are assembled.

**Architecture:** Extend `backend/reports/generator.py` item validation at the report boundary. Validate `item.profile` type plus `profile.item_id` and `profile.name` as non-empty strings, matching the fields used to build `item_names`.

**Tech Stack:** Python dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate report item identity

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/reports/generator.py`

- [x] **Step 1: Write the failing test**

Add this test near `test_report_requires_wardrobe_item_list`:

```python
def test_report_requires_valid_item_identity_fields(self) -> None:
    items = [_item("white-tee", "white tee", colors=["white"], materials={"cotton": 1.0})]
    plan = plan_laundry(items, LaundryConstraints(selected_item_ids=["white-tee"]), _campus_context())
    invalid_report_items = [
        ("profile", [WardrobeItem(profile="profile")]),  # type: ignore[arg-type]
        ("item_id", [WardrobeItem(profile=ClothingProfile(item_id=True, name="white tee"))]),  # type: ignore[arg-type]
        ("item_id", [WardrobeItem(profile=ClothingProfile(item_id="", name="white tee"))]),
        ("name", [WardrobeItem(profile=ClothingProfile(item_id="white-tee", name=True))]),  # type: ignore[arg-type]
        ("name", [WardrobeItem(profile=ClothingProfile(item_id="white-tee", name=""))]),
    ]

    for field_name, report_items in invalid_report_items:
        with self.subTest(field_name=field_name, report_items=report_items):
            with self.assertRaisesRegex(ValueError, field_name):
                generate_report(plan, report_items, _campus_context())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_item_identity_fields -v`

Expected: FAIL because invalid report item fields currently leak downstream errors or produce unrelated missing item errors.

- [x] **Step 3: Write minimal implementation**

Update the report import:

```python
ClothingProfile,
```

Add:

```python
def _validate_item(item: WardrobeItem, field_name: str) -> None:
    if not isinstance(item.profile, ClothingProfile):
        raise ValueError(f"{field_name}.profile must be a ClothingProfile")
    _non_empty_string(item.profile.item_id, f"{field_name}.profile.item_id")
    _non_empty_string(item.profile.name, f"{field_name}.profile.name")


def _non_empty_string(value: object, field_name: str) -> None:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} must be a non-empty string")
```

Then call `_validate_item(item, f"items[{index}]")` from `_validate_items`.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_report_requires_valid_item_identity_fields -v`

Expected: PASS.

- [x] **Step 5: Run focused module tests**

Run: `uv run python -m unittest tests.test_e_module -v`

Expected: PASS.

- [x] **Step 6: Run full verification**

Run: `uv run python -m unittest discover -v`

Expected: PASS.

Run: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-report-item-identity.md tests/test_e_module.py backend/reports/generator.py
git commit -m "fix: validate report item identity"
```

Expected: one local commit. Do not push or upload.
