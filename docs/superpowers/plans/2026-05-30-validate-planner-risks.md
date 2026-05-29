# Validate Planner Risks Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `plan_laundry` reject malformed `profile.risks` values before risk-based bucket and drying logic.

**Architecture:** Extend planner `_validate_item` with a risk map guard. Require a dict with non-empty string keys and `RiskLevel` values, matching the shared data contract used by planner risk checks.

**Tech Stack:** Python enum/dataclass validation, `unittest`, `uv`.

---

### Task 1: Validate planner profile risks

**Files:**
- Modify: `tests/test_e_module.py`
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Write the failing test**

Add this test near `test_plan_requires_valid_item_search_fields`:

```python
def test_plan_requires_valid_item_risks(self) -> None:
    invalid_items = [
        ("risks", WardrobeItem(profile=ClothingProfile(item_id="bad-risks", name="white tee", risks="high"))),  # type: ignore[arg-type]
        ("risks", WardrobeItem(profile=ClothingProfile(item_id="bad-risk-key", name="white tee", risks={True: RiskLevel.HIGH}))),  # type: ignore[dict-item]
        ("risks", WardrobeItem(profile=ClothingProfile(item_id="bad-risk-value", name="white tee", risks={"shrink": "high"}))),  # type: ignore[dict-item]
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

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_item_risks -v`

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
_risk_map(item.profile.risks, f"{field_name}.profile.risks")
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_e_module.EModuleTests.test_plan_requires_valid_item_risks -v`

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
git add docs/superpowers/plans/2026-05-30-validate-planner-risks.md tests/test_e_module.py backend/laundry/planner.py
git commit -m "fix: validate planner risks"
```

Expected: one local commit. Do not push or upload.
