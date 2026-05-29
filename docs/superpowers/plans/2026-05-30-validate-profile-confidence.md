# Validate Profile Confidence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make wardrobe loading reject malformed `profile.confidence` values so persisted clothing profiles keep a finite 0-to-1 confidence contract.

**Architecture:** Keep persisted profile validation in `backend/wardrobe/store.py`. Add a small numeric helper for confidence, reusing the module's existing `math.isfinite` import from ratio validation.

**Tech Stack:** Python dataclasses, `unittest`, `uv`.

---

### Task 1: Reject malformed profile confidence

**Files:**
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/store.py`

- [x] **Step 1: Write the failing test**

Add this test near the existing profile validation tests:

```python
def test_store_rejects_invalid_profile_confidence(self) -> None:
    invalid_confidences: list[object] = [True, "0.7", -0.1, 1.5, float("nan")]
    for confidence in invalid_confidences:
        with self.subTest(confidence=confidence):
            payload = json.loads((ROOT / "data" / "wardrobe_sample.json").read_text(encoding="utf-8"))
            payload["items"][0]["profile"]["confidence"] = confidence
            self.path.write_text(
                json.dumps(payload, ensure_ascii=False),
                encoding="utf-8",
            )

            with self.assertRaisesRegex(ValueError, "confidence"):
                self.store.list_items()
```

- [x] **Step 2: Run test to verify it fails**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_confidence -v`

Expected: FAIL because malformed confidence values currently load without strict validation.

- [x] **Step 3: Write minimal implementation**

In `_profile_from_dict`, validate confidence:

```python
cleaned["confidence"] = _confidence(cleaned.get("confidence", 0.0))
```

Add:

```python
def _confidence(value: Any) -> float:
    if isinstance(value, bool) or not isinstance(value, (int, float)):
        raise ValueError("confidence must be a number from 0 to 1")
    confidence = float(value)
    if not math.isfinite(confidence) or confidence < 0 or confidence > 1:
        raise ValueError("confidence must be a number from 0 to 1")
    return confidence
```

- [x] **Step 4: Run test to verify it passes**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_store_rejects_invalid_profile_confidence -v`

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
git add docs/superpowers/plans/2026-05-30-validate-profile-confidence.md tests/test_c_module.py backend/wardrobe/store.py
git commit -m "fix: validate profile confidence"
```

Expected: one local commit. Do not push or upload.
