# Add Backend Frequency English Aliases Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let backend frequency advice recognize common English garment aliases already supported by the frontend, such as `tee`, `tshirt`, `sheet`, `sheets`, and `duvet`.

**Architecture:** Extend `_FREQUENCY_THRESHOLDS` only. The previous English word-boundary matcher prevents new short aliases like `tee` from matching inside unrelated words.

**Tech Stack:** Python, `unittest`, `uv`.

---

### Task 1: Add backend frequency threshold aliases

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-add-backend-frequency-english-aliases.md`
- Modify: `tests/test_c_module.py`
- Modify: `backend/wardrobe/frequency_advisor.py`

- [x] **Step 1: Add failing backend tests**

Add near frequency recommendation tests:

```python
def test_frequency_uses_common_english_alias_thresholds(self) -> None:
    cases = [
        ("white cotton tee", 2, 45),
        ("cotton bed sheet", 1, 45),
    ]

    for name, wear_count, min_score in cases:
        with self.subTest(name=name):
            item = WardrobeItem(
                profile=ClothingProfile(
                    item_id=f"alias-{wear_count}",
                    name=name,
                    material_ratios={"cotton": 1.0},
                    colors=["white"],
                ),
                wear_count_since_wash=wear_count,
            )

            advice = advise_frequency(item, LaundryConstraints())

            self.assertGreaterEqual(advice.priority_score, min_score)
```

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_uses_common_english_alias_thresholds -v`

Expected: FAIL because backend currently does not infer thresholds from `tee` or `sheet`.

- [x] **Step 2: Extend threshold aliases**

In `_FREQUENCY_THRESHOLDS`, add:

```python
"tee": 2,
"tshirt": 2,
"sheet": 1,
"sheets": 1,
"duvet": 1,
```

- [x] **Step 3: Run target backend test**

Run: `uv run python -m unittest tests.test_c_module.CModuleTests.test_frequency_uses_common_english_alias_thresholds -v`

Expected: PASS.

- [x] **Step 4: Run focused and full backend tests**

Run:

```bash
uv run python -m unittest tests.test_c_module -v
uv run python -m unittest discover -v
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 5: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-add-backend-frequency-english-aliases.md tests/test_c_module.py backend/wardrobe/frequency_advisor.py
git commit -m "feat: add backend frequency english aliases"
```

Expected: one local commit. Do not push or upload.
