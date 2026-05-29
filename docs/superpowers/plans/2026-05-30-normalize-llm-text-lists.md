# LLM Text List Normalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent malformed LLM text-list fields from being split into characters or converted from non-string values.

**Architecture:** Tighten the existing `_string_list` helper so it accepts only list-shaped string data and trims items. Use it for LLM `source_notes` fallback selection as well as `agent_trace`.

**Tech Stack:** Python standard library, `unittest`, existing `uv` test workflow.

---

### Task 1: Cover malformed LLM text lists

**Files:**
- Modify: `tests/test_clothing_extraction.py`

- [ ] **Step 1: Write the failing test**

Add this test near the other LLM validation tests:

```python
    def test_llm_text_lists_require_string_items(self) -> None:
        response = {
            "name": "test shirt",
            "material_ratios": {"cotton": 1.0},
            "colors": ["black"],
            "care_forbidden": [],
            "risks": {},
            "confidence": 0.7,
            "source_notes": "visible tag",
            "agent_trace": [True, " typed_extractor ", "", 123],
        }

        profile = extract_clothing_info(
            ClothingInput(name="", extra={"source_notes": ["fallback note"]}),
            llm_client=FakeLLMClient(json.dumps(response, ensure_ascii=False)),
        )

        self.assertEqual(profile.source_notes, ["fallback note"])
        self.assertEqual(profile.agent_trace, ["typed_extractor"])
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_text_lists_require_string_items -v
```

Expected: FAIL because current code splits `source_notes` strings and converts non-string trace items.

### Task 2: Tighten text-list normalization

**Files:**
- Modify: `backend/clothing_extraction/extractor.py`

- [ ] **Step 1: Update `_string_list`**

```python
def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for item in value:
        if not isinstance(item, str):
            continue
        text = item.strip()
        if text:
            items.append(text)
    return items
```

- [ ] **Step 2: Route `source_notes` through `_string_list`**

Replace the LLM profile source notes expression with:

```python
        source_notes=(
            _string_list(payload.get("source_notes"))
            or _string_list(raw.extra.get("source_notes", []))
            or ["LLM returned usable JSON"]
        ),
```

- [ ] **Step 3: Run target test to verify it passes**

Run:

```bash
uv run python -m unittest tests.test_clothing_extraction.ClothingExtractionTests.test_llm_text_lists_require_string_items -v
```

Expected: PASS.

### Task 3: Verify and commit

**Files:**
- Modify: `backend/clothing_extraction/extractor.py`
- Modify: `tests/test_clothing_extraction.py`
- Create: `docs/superpowers/plans/2026-05-30-normalize-llm-text-lists.md`

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
git add docs/superpowers/plans/2026-05-30-normalize-llm-text-lists.md backend/clothing_extraction/extractor.py tests/test_clothing_extraction.py
git commit -m "fix: normalize llm text lists"
```

Expected: A local commit is created. Do not push or upload.
