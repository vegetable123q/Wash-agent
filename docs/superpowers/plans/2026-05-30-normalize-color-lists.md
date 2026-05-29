# Color List Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent malformed color payloads from creating fake colors or hiding missing color data.

**Architecture:** Add a focused helper in the clothing extraction module that accepts only list-shaped color data and string items. Use that helper for both LLM output and manual field overrides so the same contract is enforced consistently.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed LLM color payloads

**Files:**
- Modify: `tests/test_clothing_extraction.py`

- [ ] **Step 1: Write the failing test**

Add this test near the LLM validation tests:

```python
    def test_llm_colors_require_a_string_list(self) -> None:
        cases = [
            ("non-list string", "black", [], True),
            ("invalid list items", [True, 123, " Black ", "", "black"], ["black"], False),
        ]
        for label, colors, expected_colors, colors_missing in cases:
            with self.subTest(label=label):
                response = {
                    "name": "test shirt",
                    "material_ratios": {"cotton": 1.0},
                    "colors": colors,
                    "care_forbidden": [],
                    "risks": {},
                    "confidence": 0.7,
                }

                profile = extract_clothing_info(
                    ClothingInput(name="test shirt"),
                    llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
                )

                self.assertEqual(profile.colors, expected_colors)
                self.assertEqual("colors" in profile.missing_fields, colors_missing)
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_colors_require_a_string_list -v
```

Expected: FAIL because the current code converts non-string items and iterates non-list strings.

### Task 2: Add color normalization helper

**Files:**
- Modify: `backend/clothing_extraction/extractor.py`

- [ ] **Step 1: Add helper near `_string_list`**

```python
def _normalize_colors(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    colors: list[str] = []
    seen: set[str] = set()
    for item in value:
        if not isinstance(item, str):
            continue
        color = item.strip().lower()
        if color and color not in seen:
            colors.append(color)
            seen.add(color)
    return colors
```

- [ ] **Step 2: Use helper for manual fields**

Replace the manual color list comprehension with:

```python
        normalized_colors = _normalize_colors(colors)
```

- [ ] **Step 3: Use helper for LLM output**

Replace:

```python
        colors=[str(color).lower() for color in payload.get("colors") or []],
```

with:

```python
        colors=_normalize_colors(payload.get("colors")),
```

- [ ] **Step 4: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_colors_require_a_string_list -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/clothing_extraction/extractor.py`
- Modify: `tests/test_clothing_extraction.py`
- Create: `docs/superpowers/plans/2026-05-30-normalize-color-lists.md`

- [ ] **Step 1: Run focused clothing extraction tests**

```bash
uv run python -m unittest tests.test_clothing_extraction -v
```

Expected: PASS.

- [ ] **Step 2: Run full backend test suite**

```bash
uv run python -m unittest discover -v
```

Expected: PASS.

- [ ] **Step 3: Check patch formatting**

```bash
git diff --check
```

Expected: exit code 0. CRLF warnings are acceptable on Windows.

- [ ] **Step 4: Commit locally only**

```bash
git add docs/superpowers/plans/2026-05-30-normalize-color-lists.md backend/clothing_extraction/extractor.py tests/test_clothing_extraction.py
git commit -m "fix: normalize clothing color lists"
```

Expected: A local commit is created. Do not push or upload.
