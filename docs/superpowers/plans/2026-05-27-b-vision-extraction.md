# B Vision Extraction Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build B module data acquisition so clothing photos, tag photos, Taobao/product-page screenshots, supplemental text, and manual user fields can be merged into a reliable `ClothingProfile`.

**Architecture:** Keep the existing B boundaries: `llm_client.py` owns the API call, `product_info.py` normalizes all user/product/source inputs, and `clothing_extractor.py` merges LLM output with deterministic fallback and user overrides. The LLM client remains OpenAI-compatible and safe without API keys; image support is added through optional `image_refs` so existing text-only tests and mocks keep working.

**Tech Stack:** Python 3.12 standard library, `unittest`, dataclasses, OpenAI-compatible chat completions API, base64 data URLs for local uploaded images.

---

## File Structure

- Modify `backend/models.py`
  - Add optional `missing_fields` and `user_fill_suggestions` fields to `ClothingProfile` so downstream UI can ask the user to fill data not found in images or text.
- Modify `backend/llm_client.py`
  - Extend `LLMClient.complete()` with optional `image_refs`.
  - Add helpers to convert local image paths, `http(s)` URLs, and `data:image/...` URLs into OpenAI-compatible `image_url` message parts.
  - Update `build_extraction_prompt()` so the LLM is explicitly asked to inspect clothing photos, tag photos, product-page screenshots, and return `missing_fields`.
  - Keep `LocalFallbackLLMClient` no-network behavior unchanged.
- Modify `backend/product_info.py`
  - Normalize `extra["ocr_text"]`, `extra["product_page_text"]`, `extra["taobao_text"]`, `extra["supplemental_sources"]`, and `extra["manual_fields"]`.
  - Include these sources in `normalized_source_text` and source notes.
- Modify `backend/clothing_extractor.py`
  - Send `image_refs` to clients that accept image input.
  - Parse optional LLM `missing_fields`.
  - Apply manual user fields after LLM/fallback.
  - Compute missing-field suggestions when data is still incomplete.
- Modify `tests/test_b_modules.py`
  - Add tests for image dispatch, multimodal payload construction, supplemental source normalization, manual field overrides, and missing-field prompts.

---

### Task 1: Extend Tests For B Flow

**Files:**
- Modify: `tests/test_b_modules.py`

- [ ] **Step 1: Add a fake vision-capable client**

Add this class near the existing fake clients:

```python
class FakeVisionLLMClient:
    def __init__(self, text: str) -> None:
        self.text = text
        self.prompts: list[str] = []
        self.image_refs: list[list[str]] = []

    def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        image_refs: list[str] | None = None,
    ) -> LLMResponse:
        self.prompts.append(prompt)
        self.image_refs.append(list(image_refs or []))
        return LLMResponse(text=self.text, provider="fake-vision", model="unit-test")
```

- [ ] **Step 2: Add failing tests for new behavior**

Add these tests to `BModuleTests`:

```python
def test_enrich_product_info_merges_supplemental_sources_and_manual_fields(self) -> None:
    raw = ClothingInput(
        name="牛仔外套",
        image_refs=["tag.jpg"],
        extra={
            "ocr_text": "吊牌识别: 棉 80% 聚酯纤维 20%",
            "taobao_text": "淘宝页: 深蓝色 牛仔 不可漂白",
            "supplemental_sources": [
                {"source": "brand_page", "text": "建议反面冷水洗涤"},
            ],
            "manual_fields": {"colors": ["blue", "dark"]},
        },
    )

    enriched = enrich_product_info(raw)

    source_text = enriched.extra["normalized_source_text"]
    self.assertIn("吊牌识别", source_text)
    self.assertIn("淘宝页", source_text)
    self.assertIn("brand_page", source_text)
    self.assertIn("用户手填字段", source_text)
    self.assertIn("tag.jpg", source_text)
```

```python
def test_extract_clothing_info_sends_uploaded_images_to_llm(self) -> None:
    response = {
        "name": "黑色运动T恤",
        "material_ratios": {"polyester": 0.92, "spandex": 0.08},
        "colors": ["black"],
        "care_forbidden": ["do_not_bleach"],
        "risks": {"color_bleed": "medium"},
        "confidence": 0.88,
        "source_notes": ["vision parsed tag photo"],
    }
    fake = FakeVisionLLMClient(json.dumps(response, ensure_ascii=False))

    profile = extract_clothing_info(
        ClothingInput(name="运动T恤", image_refs=["uploads/tag-photo.png"]),
        llm_client=fake,
    )

    self.assertEqual(fake.image_refs, [["uploads/tag-photo.png"]])
    self.assertEqual(profile.name, "黑色运动T恤")
    self.assertEqual(profile.material_ratios["polyester"], 0.92)
    self.assertIn("black", profile.colors)
```

```python
def test_openai_client_builds_multimodal_payload_without_network(self) -> None:
    import base64
    import tempfile
    from pathlib import Path
    from unittest.mock import patch

    from backend.llm_client import OpenAICompatibleLLMClient

    captured: dict[str, object] = {}

    class FakeHTTPResponse:
        def __enter__(self) -> "FakeHTTPResponse":
            return self

        def __exit__(self, *args: object) -> None:
            return None

        def read(self) -> bytes:
            return b'{"choices":[{"message":{"content":"{}"}}]}'

    def fake_urlopen(request, timeout):
        captured["payload"] = json.loads(request.data.decode("utf-8"))
        captured["timeout"] = timeout
        return FakeHTTPResponse()

    with tempfile.TemporaryDirectory() as tmp_dir:
        image_path = Path(tmp_dir) / "tag.png"
        image_path.write_bytes(base64.b64decode("iVBORw0KGgo="))
        client = OpenAICompatibleLLMClient(api_key="test-key", base_url="https://example.test")

        with patch("urllib.request.urlopen", fake_urlopen):
            response = client.complete("extract", image_refs=[str(image_path)])

    user_content = captured["payload"]["messages"][1]["content"]
    self.assertEqual(response.provider, "openai-compatible")
    self.assertEqual(user_content[0], {"type": "text", "text": "extract"})
    self.assertEqual(user_content[1]["type"], "image_url")
    self.assertTrue(user_content[1]["image_url"]["url"].startswith("data:image/png;base64,"))
```

```python
def test_manual_fields_fill_missing_image_data_after_fallback(self) -> None:
    profile = extract_clothing_info(
        ClothingInput(
            name="针织衫",
            image_refs=["blurred-tag.jpg"],
            extra={
                "manual_fields": {
                    "material_ratios": {"wool": 70, "nylon": 30},
                    "colors": ["light"],
                    "care_forbidden": ["hand_wash_only"],
                    "risks": {"deform": "high"},
                }
            },
        ),
        llm_client=BrokenLLMClient(),
    )

    self.assertAlmostEqual(profile.material_ratios["wool"], 0.7)
    self.assertAlmostEqual(profile.material_ratios["nylon"], 0.3)
    self.assertEqual(profile.colors, ["light"])
    self.assertIn("hand_wash_only", profile.care_forbidden)
    self.assertEqual(profile.risks["deform"], RiskLevel.HIGH)
    self.assertNotIn("material_ratios", profile.missing_fields)
```

```python
def test_missing_fields_are_reported_when_sources_are_insufficient(self) -> None:
    profile = extract_clothing_info(
        ClothingInput(name="外套", user_description="只知道是日常穿的外套"),
        llm_client=BrokenLLMClient(),
    )

    self.assertIn("material_ratios", profile.missing_fields)
    self.assertIn("colors", profile.missing_fields)
    self.assertIn("material_ratios", profile.user_fill_suggestions)
```

- [ ] **Step 3: Run tests to verify they fail**

Run: `python -m unittest tests.test_b_modules -v`

Expected: FAIL because `FakeVisionLLMClient` image path is not passed yet, supplemental source text is missing, and `ClothingProfile` has no `missing_fields`.

---

### Task 2: Add Model Fields And Vision LLM Support

**Files:**
- Modify: `backend/models.py`
- Modify: `backend/llm_client.py`
- Test: `tests/test_b_modules.py`

- [ ] **Step 1: Extend `ClothingProfile`**

In `backend/models.py`, append these fields to `ClothingProfile` with defaults:

```python
missing_fields: list[str] = field(default_factory=list)
user_fill_suggestions: dict[str, str] = field(default_factory=dict)
```

- [ ] **Step 2: Update the client protocol and local fallback**

In `backend/llm_client.py`, change both `LLMClient.complete` and `LocalFallbackLLMClient.complete` to accept:

```python
image_refs: list[str] | None = None
```

The fallback should still return `LLMResponse(text="{}", provider="local-fallback", model="rule-based")`.

- [ ] **Step 3: Add image content helpers**

Add standard-library helpers to `backend/llm_client.py`:

```python
import base64
import mimetypes
from pathlib import Path


def _image_ref_to_url(image_ref: str) -> str:
    if image_ref.startswith(("http://", "https://", "data:image/")):
        return image_ref
    path = Path(image_ref)
    mime_type = mimetypes.guess_type(path.name)[0] or "image/jpeg"
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _build_user_content(prompt: str, image_refs: list[str] | None) -> str | list[dict[str, Any]]:
    if not image_refs:
        return prompt
    content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
    for image_ref in image_refs:
        content.append({"type": "image_url", "image_url": {"url": _image_ref_to_url(image_ref)}})
    return content
```

- [ ] **Step 4: Use image content in `OpenAICompatibleLLMClient.complete`**

Change the method signature to accept `image_refs`, and build the payload with:

```python
"messages": [
    {"role": "system", "content": "You extract clothing care facts from text and images and return JSON only."},
    {"role": "user", "content": _build_user_content(prompt, image_refs)},
],
```

Keep existing error normalization.

- [ ] **Step 5: Update `build_extraction_prompt` for multimodal extraction**

In `backend/llm_client.py`, update the prompt schema to include:

```python
"missing_fields": ["material_ratios", "colors", "care_forbidden"]
```

Add rules that say:

```text
- 如果输入包含衣服照片、吊牌照片或淘宝/商品页截图，请同时读取图片中的款式、颜色、材质成分、洗护图标和商品页文案。
- 对图片或文字中没有、且不能可靠推断的信息，不要编造；把字段名放入 missing_fields，供用户手填。
- 如果用户手填字段与图片/文字冲突，优先保留用户手填字段，并在 source_notes 说明。
```

- [ ] **Step 6: Run focused tests**

Run: `python -m unittest tests.test_b_modules.BModuleTests.test_create_default_llm_client_is_safe_without_api_key -v`

Expected: PASS.

- [ ] **Step 7: Run multimodal payload test**

Run: `python -m unittest tests.test_b_modules.BModuleTests.test_openai_client_builds_multimodal_payload_without_network -v`

Expected: PASS and no real network request.

---

### Task 3: Normalize Supplemental Sources

**Files:**
- Modify: `backend/product_info.py`
- Test: `tests/test_b_modules.py`

- [ ] **Step 1: Add source normalization helpers**

Add helpers in `backend/product_info.py`:

```python
from typing import Any


def _format_source(label: str, value: str) -> str:
    text = _normalize_text(value)
    return f"{label}: {text}" if text else ""


def _iter_supplemental_sources(extra: dict[str, Any]) -> list[str]:
    parts: list[str] = []
    for key, label in (
        ("ocr_text", "OCR/图片识别文字"),
        ("product_page_text", "商品页文字"),
        ("taobao_text", "淘宝商品页文字"),
    ):
        formatted = _format_source(label, str(extra.get(key, "")))
        if formatted:
            parts.append(formatted)

    for index, source in enumerate(extra.get("supplemental_sources") or [], start=1):
        if isinstance(source, dict):
            name = _normalize_text(str(source.get("source") or f"补充来源{index}"))
            text = _normalize_text(str(source.get("text") or ""))
            if text:
                parts.append(f"{name}: {text}")
        else:
            text = _normalize_text(str(source))
            if text:
                parts.append(f"补充来源{index}: {text}")
    return parts
```

- [ ] **Step 2: Include manual fields as source text**

Inside `enrich_product_info`, explicitly initialize and wire these values:

```python
extra = dict(raw.extra)
supplemental_parts = _iter_supplemental_sources(extra)
manual_fields = extra.get("manual_fields") if isinstance(extra.get("manual_fields"), dict) else {}
source_parts.extend(supplemental_parts)
```

When `manual_fields` is non-empty, append:

```python
source_parts.append(
    "用户手填字段: "
    + json.dumps(manual_fields, ensure_ascii=False, sort_keys=True)
)
```

Add `import json`.

- [ ] **Step 3: Add source notes**

Append notes when supplemental sources or manual fields are present:

```python
if supplemental_parts:
    source_notes.append("包含图片/OCR/商品页等补充来源")
if manual_fields:
    source_notes.append("包含用户手填字段")
```

- [ ] **Step 4: Run focused test**

Run: `python -m unittest tests.test_b_modules.BModuleTests.test_enrich_product_info_merges_supplemental_sources_and_manual_fields -v`

Expected: PASS.

---

### Task 4: Merge LLM, Fallback, Missing Fields, And Manual User Input

**Files:**
- Modify: `backend/clothing_extractor.py`
- Test: `tests/test_b_modules.py`

- [ ] **Step 1: Add missing-field helpers**

Add to `backend/clothing_extractor.py`:

```python
_USER_FILL_SUGGESTIONS = {
    "material_ratios": "请补充吊牌材质成分，例如 棉 80%、聚酯纤维 20%。",
    "colors": "请补充衣物主色和深浅，例如 black、blue、dark。",
    "care_forbidden": "请补充洗护禁忌，例如 不可漂白、不可烘干、只能手洗。",
}


def _missing_fields_for_profile(profile: ClothingProfile) -> list[str]:
    missing: list[str] = []
    if not profile.material_ratios:
        missing.append("material_ratios")
    if not profile.colors:
        missing.append("colors")
    if not profile.care_forbidden:
        missing.append("care_forbidden")
    return missing


def _with_missing_fields(profile: ClothingProfile, requested: list[str] | None = None) -> ClothingProfile:
    missing = list(dict.fromkeys([*(requested or []), *_missing_fields_for_profile(profile)]))
    profile.missing_fields[:] = missing
    profile.user_fill_suggestions.clear()
    profile.user_fill_suggestions.update(
        {field: _USER_FILL_SUGGESTIONS[field] for field in missing if field in _USER_FILL_SUGGESTIONS}
    )
    return profile
```

When calling `_with_missing_fields` after a profile has already been through this helper, preserve existing values with:

```python
_with_missing_fields(profile, profile.missing_fields)
```

- [ ] **Step 2: Add manual override helper**

Add a helper that handles fields from `raw.extra["manual_fields"]`:

```python
def _apply_manual_fields(profile: ClothingProfile, manual_fields: Any) -> ClothingProfile:
    if not isinstance(manual_fields, dict) or not manual_fields:
        return profile
    if isinstance(manual_fields.get("name"), str) and manual_fields["name"].strip():
        profile.name = manual_fields["name"].strip()
    if isinstance(manual_fields.get("material_ratios"), dict):
        normalized = {
            str(key).lower(): ratio
            for key, value in manual_fields["material_ratios"].items()
            if (ratio := _normalize_ratio(value)) is not None
        }
        if normalized:
            profile.material_ratios = normalized
    if isinstance(manual_fields.get("colors"), list):
        colors = [str(color).lower() for color in manual_fields["colors"] if str(color).strip()]
        if colors:
            profile.colors = colors
    if isinstance(manual_fields.get("care_forbidden"), list):
        forbidden = [str(item) for item in manual_fields["care_forbidden"] if str(item).strip()]
        if forbidden:
            profile.care_forbidden = forbidden
    if isinstance(manual_fields.get("risks"), dict):
        profile.risks.update(
            {str(key): _risk_level(value) for key, value in manual_fields["risks"].items()}
        )
    profile.confidence = max(profile.confidence, 0.9)
    profile.source_notes.append("manual user fields applied")
    return profile
```

- [ ] **Step 3: Parse LLM missing fields**

In `_profile_from_llm`, parse:

```python
llm_missing = [str(field) for field in payload.get("missing_fields") or []]
```

Pass the returned profile through `_with_missing_fields(profile, llm_missing)`.

- [ ] **Step 4: Pass image refs to capable clients**

In `extract_clothing_info`, call:

```python
kwargs: dict[str, Any] = {"temperature": 0.0}
if enriched.image_refs:
    kwargs["image_refs"] = enriched.image_refs
response = client.complete(prompt, **kwargs)
```

If this raises `TypeError` because a legacy fake client lacks `image_refs`, retry with only `temperature`.

- [ ] **Step 5: Apply manual fields and missing-field suggestions before returning**

For both LLM and fallback branches:

```python
profile = _apply_manual_fields(profile, enriched.extra.get("manual_fields"))
return _with_missing_fields(profile, profile.missing_fields)
```

- [ ] **Step 6: Run focused tests**

Run: `python -m unittest tests.test_b_modules.BModuleTests.test_extract_clothing_info_sends_uploaded_images_to_llm tests.test_b_modules.BModuleTests.test_manual_fields_fill_missing_image_data_after_fallback tests.test_b_modules.BModuleTests.test_missing_fields_are_reported_when_sources_are_insufficient -v`

Expected: PASS.

---

### Task 5: Full Verification

**Files:**
- Verify all B files and tests.

- [ ] **Step 1: Run all B tests**

Run: `python -m unittest tests.test_b_modules -v`

Expected: PASS.

- [ ] **Step 2: Run all tests discovered by unittest**

Run: `python -m unittest discover -v`

Expected: PASS.

- [ ] **Step 3: Inspect final diff**

Run: `git diff -- backend/models.py backend/llm_client.py backend/product_info.py backend/clothing_extractor.py tests/test_b_modules.py docs/superpowers/plans/2026-05-27-b-vision-extraction.md`

Expected: diff only contains B implementation, B tests, and this plan.

- [ ] **Step 4: Do not commit unless explicitly requested**

Because the workspace already contains uncommitted B-module work and the user did not ask for a git commit, stop after verification and report files changed plus test output.
