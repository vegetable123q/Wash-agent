# Validate Frequency Profile Risks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frequency advice reject malformed `profile.risks` values before risk penalty scoring.

**Architecture:** Keep direct `WardrobeItem` validation in `backend/wardrobe/frequency_advisor.py`. Validate that `profile.risks` is a dict with non-empty string keys and `RiskLevel` values before `_risk_penalty` reads it.

**Tech Stack:** Python enum/dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate profile risks

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [x] **Step 1: Write the failing test**

Update the test import to include `RiskLevel`, then add this test near the existing frequency validation tests:

```python
def test_frequency_requires_valid_profile_risks(self) -> None:
    invalid_profiles = [
        ("item.profile.risks", ClothingProfile(item_id="bad-risks", name="cotton t-shirt", risks="high")),  # type: ignore[arg-type]
        ("item.profile.risks", ClothingProfile(item_id="bad-risk-key", name="cotton t-shirt", risks={True: RiskLevel.HIGH})),  # type: ignore[dict-item]
        ("item.profile.risks", ClothingProfile(item_id="bad-risk-value", name="cotton t-shirt", risks={"shrink": "high"})),  # type: ignore[dict-item]
    ]

    for field_name, profile in invalid_profiles:
        with self.subTest(field_name=field_name, profile=profile):
            item = WardrobeItem(profile=profile)

            with self.assertRaisesRegex(ValueError, field_name):
                advise_frequency(item, LaundryConstraints())
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_profile_risks -v`

Expected: FAIL because malformed risks currently leak downstream errors or are silently accepted.

- [x] **Step 3: Write minimal implementation**

Add:

```python
def _risk_map(value: object, field_name: str) -> None:
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be an object")
    for key, level in value.items():
        if not isinstance(key, str) or not key.strip():
            raise ValueError(f"{field_name} must contain non-empty string keys")
        if not isinstance(level, RiskLevel):
            raise ValueError(f"{field_name}.{key} must be a RiskLevel")
```

Then update `_validate_item`:

```python
_risk_map(value.profile.risks, "item.profile.risks")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_requires_valid_profile_risks -v`

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
git add docs/superpowers/plans/2026-05-30-validate-frequency-profile-risks.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py
git commit -m "fix: validate frequency profile risks"
```

Expected: one local commit. Do not push or upload.
