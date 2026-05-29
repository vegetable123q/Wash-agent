# Validate Wardrobe Profile Shape Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wardrobe loading reject non-object `profile` payloads with a stable, field-specific `ValueError`.

**Architecture:** Keep validation at the wardrobe persistence boundary in `backend/wardrobe/store.py`. Add one regression test in the existing C module unittest suite and a minimal helper check before `ClothingProfile` deserialization.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject non-object wardrobe profiles

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing wardrobe store validation tests:

```python
def test_store_rejects_invalid_profile_shape(self) -> None:
    invalid_profiles: list[object] = [True, ["profile"], "profile"]
    for profile in invalid_profiles:
        with self.subTest(profile=profile):
            payload = json.loads(self.path.read_text(encoding="utf-8"))
            payload["items"][0]["profile"] = profile
            self.path.write_text(
                json.dumps(payload, ensure_ascii=False),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "profile"):
                self.store.list_items()
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_shape -v`

Expected: FAIL because a non-object `profile` currently reaches generic dictionary validation and does not raise a stable `ValueError` containing `profile`.

- [x] **Step 3: Write minimal implementation**

In `_wardrobe_item_from_dict`, validate `profile` before calling `_profile_from_dict`:

```python
profile = data["profile"]
if not isinstance(profile, dict):
    raise ValueError("profile must be an object")
```

Then pass `profile` into `_profile_from_dict`.

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_shape -v`

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
git add docs/superpowers/plans/2026-05-30-validate-wardrobe-profile-shape.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: validate wardrobe profile shape"
```

Expected: one local commit. Do not push or upload.
