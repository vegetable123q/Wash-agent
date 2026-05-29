# Validate Profile Material Ratios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wardrobe loading reject malformed `profile.material_ratios` values before downstream material search and laundry grouping logic reads them.

**Architecture:** Keep persisted profile validation in `backend/wardrobe/store.py`. Add a strict ratio-map helper that accepts only an object with non-empty string keys and finite numeric ratios from 0 to 1.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject malformed profile material ratios

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing profile validation tests:

```python
def test_store_rejects_invalid_profile_material_ratios(self) -> None:
    invalid_ratios: list[object] = [
        True,
        ["cotton"],
        {"": 0.5},
        {"cotton": True},
        {"cotton": -0.1},
        {"cotton": 1.5},
        {"cotton": float("nan")},
    ]
    for ratios in invalid_ratios:
        with self.subTest(ratios=ratios):
            payload = json.loads((ROOT / "data" / "wardrobe_sample.json").read_text(encoding="utf-8"))
            payload["items"][0]["profile"]["material_ratios"] = ratios
            self.path.write_text(
                json.dumps(payload, ensure_ascii=False),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "material_ratios"):
                self.store.list_items()
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_material_ratios -v`

Expected: FAIL because malformed material ratios currently load without strict validation.

- [x] **Step 3: Write minimal implementation**

In `backend/wardrobe/store.py`:

```python
import math
```

In `_profile_from_dict`, validate material ratios:

```python
cleaned["material_ratios"] = _ratio_map(cleaned.get("material_ratios"))
```

Add:

```python
def _ratio_map(value: Any) -> dict[str, float]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError("material_ratios must be an object")
    ratios: dict[str, float] = {}
    for key, item_value in value.items():
        if not isinstance(key, str) or not key.strip():
            raise ValueError("material_ratios must contain non-empty string keys")
        if isinstance(item_value, bool) or not isinstance(item_value, (int, float)):
            raise ValueError(f"material_ratios.{key} must be a ratio from 0 to 1")
        ratio = float(item_value)
        if not math.isfinite(ratio) or ratio < 0 or ratio > 1:
            raise ValueError(f"material_ratios.{key} must be a ratio from 0 to 1")
        ratios[key.strip()] = ratio
    return ratios
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_material_ratios -v`

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
git add docs/superpowers/plans/2026-05-30-validate-profile-material-ratios.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: validate profile material ratios"
```

Expected: one local commit. Do not push or upload.
