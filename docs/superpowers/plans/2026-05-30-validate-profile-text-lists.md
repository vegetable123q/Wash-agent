# Validate Profile Text Lists Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wardrobe loading reject malformed optional `ClothingProfile` text-list fields before downstream recommendation and reporting code reads them.

**Architecture:** Keep persisted profile normalization inside `backend/wardrobe/store.py`. Reuse the existing strict `_string_list` helper for optional profile fields whose model contract is `list[str]`, while preserving defaults when fields are absent.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject malformed profile text-list fields

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing profile validation tests:

```python
def test_store_rejects_invalid_profile_text_lists(self) -> None:
    fields = [
        "care_forbidden",
        "care_warnings",
        "care_recommendations",
        "source_notes",
        "missing_fields",
        "agent_trace",
    ]
    invalid_values: list[object] = ["note", [True], [123]]
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

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_text_lists -v`

Expected: FAIL because these optional list fields currently load without strict validation.

- [x] **Step 3: Write minimal implementation**

In `_profile_from_dict`, validate optional text-list fields before constructing `ClothingProfile`:

```python
for field_name in (
    "care_forbidden",
    "care_warnings",
    "care_recommendations",
    "source_notes",
    "missing_fields",
    "agent_trace",
):
    cleaned[field_name] = _string_list(cleaned.get(field_name, []), field_name)
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_text_lists -v`

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
git add docs/superpowers/plans/2026-05-30-validate-profile-text-lists.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: validate profile text lists"
```

Expected: one local commit. Do not push or upload.
