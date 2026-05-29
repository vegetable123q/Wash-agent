# Validate Profile Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wardrobe loading reject malformed `profile.colors` values before they can affect downstream search and laundry grouping logic.

**Architecture:** Keep optional `ClothingProfile` field validation in `backend/wardrobe/store.py` next to existing profile field normalization. Reuse the store's strict `_string_list` helper so persisted wardrobe data either loads with `list[str]` colors or fails with a clear field-specific error.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject malformed profile colors

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing profile validation tests:

```python
def test_store_rejects_invalid_profile_colors(self) -> None:
    invalid_colors: list[object] = ["black", [True], [123]]
    for colors in invalid_colors:
        with self.subTest(colors=colors):
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            payload["items"][0]["profile"]["colors"] = colors
            self.path.write_text(
                json.dumps(payload, ensure_ascii=False),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "colors"):
                self.store.list_items()
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_colors -v`

Expected: FAIL because malformed `colors` values currently load into `ClothingProfile` without strict validation.

- [x] **Step 3: Write minimal implementation**

In `_profile_from_dict`, validate `colors` before constructing `ClothingProfile`:

```python
cleaned["colors"] = _string_list(cleaned.get("colors", []), "colors")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_colors -v`

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
git add docs/superpowers/plans/2026-05-30-validate-profile-colors.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: validate profile colors"
```

Expected: one local commit. Do not push or upload.
