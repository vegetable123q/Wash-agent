"""LLM client interface and prompt execution boundary."""

from __future__ import annotations

import base64
import json
import mimetypes
import os
import urllib.error
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from typing import Protocol

from .models import LLMResponse

_SUPPORTED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}


class LLMClient(Protocol):
    """Protocol implemented by real or mock LLM clients."""

    def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        image_refs: list[str] | None = None,
    ) -> LLMResponse:
        """Return a normalized LLM response for a prompt."""
        raise NotImplementedError


@dataclass(slots=True)
class LocalNoopLLMClient:
    """No-network client used to report that no API key is configured."""

    provider: str = "local-noop"
    model: str = "rule-based"

    def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        image_refs: list[str] | None = None,
    ) -> LLMResponse:
        """Return empty JSON so callers can report LLM unavailability."""
        return LLMResponse(text="{}", provider=self.provider, model=self.model)


def _image_ref_to_url(image_ref: str) -> str:
    if image_ref.startswith(("http://", "https://", "data:image/")):
        return image_ref
    path = Path(image_ref)
    mime_type = mimetypes.guess_type(path.name)[0]
    if mime_type not in _SUPPORTED_IMAGE_MIME_TYPES:
        raise ValueError(f"Unsupported image type for {path.name}: {mime_type}")
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _build_user_content(
    prompt: str,
    image_refs: list[str] | None,
) -> str | list[dict[str, Any]]:
    if not image_refs:
        return prompt
    content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
    for image_ref in image_refs:
        content.append(
            {"type": "image_url", "image_url": {"url": _image_ref_to_url(image_ref)}}
        )
    return content


@dataclass(slots=True)
class OpenAICompatibleLLMClient:
    """Minimal OpenAI-compatible chat completions client."""

    api_key: str
    base_url: str = "https://api.openai.com/v1"
    model: str = "gpt-4o-mini"
    timeout_seconds: float = 20.0

    def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        image_refs: list[str] | None = None,
    ) -> LLMResponse:
        """Call a chat-completions endpoint and normalize failures."""
        endpoint = self.base_url.rstrip("/") + "/chat/completions"

        try:
            payload = {
                "model": self.model,
                "messages": [
                    {
                        "role": "system",
                        "content": (
                            "You extract clothing care facts from text and images "
                            "and return JSON only."
                        ),
                    },
                    {"role": "user", "content": _build_user_content(prompt, image_refs)},
                ],
                "temperature": temperature,
                "response_format": {"type": "json_object"},
            }
            request = urllib.request.Request(
                endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Authorization": f"Bearer {self.api_key}",
                    "Content-Type": "application/json",
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                raw_text = response.read().decode("utf-8")
            raw: dict[str, Any] = json.loads(raw_text)
            content = (
                raw.get("choices", [{}])[0]
                .get("message", {})
                .get("content", "{}")
            )
            return LLMResponse(
                text=content,
                provider="openai-compatible",
                model=self.model,
                raw=raw,
            )
        except (
            OSError,
            urllib.error.URLError,
            json.JSONDecodeError,
            KeyError,
            IndexError,
            ValueError,
        ) as exc:
            return LLMResponse(
                text="{}",
                provider="openai-compatible",
                model=self.model,
                raw={"error": str(exc)},
            )


def build_extraction_prompt(source_text: str) -> str:
    """Build the prompt used by clothing extraction."""
    return f"""
你是校园共享洗衣场景的衣物信息抽取助手。请只输出 JSON，不要输出解释文字。

从输入中抽取衣物信息，字段必须符合下面 schema：
{{
  "name": "衣物名称",
  "material_ratios": {{"cotton": 0.8, "polyester": 0.2}},
  "colors": ["white", "gray", "dark"],
  "care_forbidden": ["do_not_bleach", "do_not_tumble_dry"],
  "care_symbols": {{"wash_method": "machine_wash|hand_wash_only|do_not_wash", "wash_temperature": "cold|30c|40c|60c|95c", "bleach": "allowed|non_chlorine_only|do_not_bleach", "tumble_dry": "allowed|low_heat|normal_heat|high_heat|do_not_tumble_dry", "iron": "low_heat|medium_heat|high_heat|do_not_iron", "dry_clean": "allowed|dry_clean_only|do_not_dry_clean", "natural_dry": "line_dry|flat_dry|drip_dry|shade_dry"}},
  "risks": {{"shrink": "low|medium|high|unknown", "color_bleed": "low|medium|high|unknown", "deform": "low|medium|high|unknown", "pilling": "low|medium|high|unknown", "dryer_damage": "low|medium|high|unknown"}},
  "confidence": 0.0,
  "source_notes": ["简短说明信息来自哪里"],
  "missing_fields": ["material_ratios", "colors", "care_forbidden"]
}}

规则：
- material_ratios 使用英文小写材质键，比例为 0 到 1；不知道比例时给合理估计。
- colors 使用英文小写颜色词；深色可用 "dark"，浅色可用 "light"。
- care_symbols 按常见水洗标维度输出：wash_method、wash_temperature、bleach、tumble_dry、iron、dry_clean、natural_dry；只输出能看见或能合理推断的维度。
- care_forbidden 只能使用这些 canonical labels：do_not_bleach, do_not_tumble_dry, do_not_wash, hand_wash_only, dry_clean_only, do_not_dry_clean, do_not_iron, do_not_machine_wash, avoid_hot_water, cold_wash, low_temperature_only, wash_separately, use_laundry_bag, gentle_cycle, air_dry, flat_dry；不要输出其他标签。
- risks 的等级只能是 low、medium、high、unknown。
- confidence 为 0 到 1。
- 如果输入包含衣服照片、吊牌照片或淘宝/商品页截图，请同时读取图片中的款式、颜色、材质成分、洗护图标和商品页文案。
- 对图片或文字中没有、且不能可靠推断的信息，不要编造；把字段名放入 missing_fields，供用户手填。
- 如果用户手填字段与图片/文字冲突，优先保留用户手填字段，并在 source_notes 说明。
- 商品名、商品页文字和图片只用于补全材质/洗护信息，不要输出店铺、购买链接、价格或推荐语。

输入：
{source_text}
""".strip()


def build_image_router_prompt(source_text: str) -> str:
    """Build the first-stage prompt that classifies what kind of image was sent."""
    return f"""
[ImageRouterAgent]
You only classify the image/source type. Do not infer material or care rules.
Return JSON only:
{{
  "image_type": "garment_photo|care_label|tag_photo|product_page|mixed|low_quality|unknown",
  "confidence": 0.0,
  "source_notes": ["short reason"]
}}

Definitions:
- garment_photo: ordinary clothing photo where fabric shape/color is visible.
- care_label or tag_photo: textile label, hang tag, washing symbols, or composition text.
- product_page: e-commerce or product detail screenshot with marketing/spec text.
- mixed: multiple useful regions/types in one image.
- low_quality: too blurry/cropped/dark for reliable extraction.

Input/source context:
{source_text}
""".strip()


def build_typed_extraction_prompt(source_text: str, image_type: str) -> str:
    """Build the second-stage prompt specialized for the routed image type."""
    type_rules = {
        "care_label": (
            "Prioritize OCR, fiber composition, wash care symbols, and exact visible text. "
            "Only mark material/care evidence as visible when the label explicitly shows it. "
            "Decode care symbols carefully."
        ),
        "tag_photo": (
            "Prioritize OCR from hang tags, product cards, and label text. Extract exact "
            "composition and care symbols when visible."
        ),
        "product_page": (
            "Extract product title, visible material copy, color, and care copy. Ignore "
            "shop name, price, links, promotions, and recommendations."
        ),
        "garment_photo": (
            "Extract visual fabric cues, garment type, colors, prints, coatings, knits, "
            "denim, padding, and contrast panels. Do not pretend inferred details are visible."
        ),
        "mixed": (
            "Separate visible regions mentally: product text, care label/tag, and garment "
            "photo. Extract visible facts from each region without mixing them."
        ),
        "low_quality": (
            "Extract only high-confidence visual facts. Mark unclear material and care as "
            "missing for the inference agent."
        ),
    }
    guidance = type_rules.get(image_type, type_rules["garment_photo"])
    return f"""
[TypedExtractionAgent]
Image type: {image_type}
Responsibility: extract visible facts for this image type. Do not do best-effort completion.
Specialized rules: {guidance}

Return JSON only:
{{
  "name": "clothing name",
  "material_ratios": {{"cotton": 0.8, "polyester": 0.2}},
  "material_evidence_level": "visible|unknown",
  "colors": ["black", "white"],
  "care_forbidden": ["do_not_bleach", "do_not_tumble_dry"],
  "care_symbols": {{"wash_method": "machine_wash|hand_wash_only|do_not_wash", "wash_temperature": "cold|30c|40c|60c|95c", "bleach": "allowed|non_chlorine_only|do_not_bleach", "tumble_dry": "allowed|low_heat|normal_heat|high_heat|do_not_tumble_dry", "iron": "low_heat|medium_heat|high_heat|do_not_iron", "dry_clean": "allowed|dry_clean_only|do_not_dry_clean", "natural_dry": "line_dry|flat_dry|drip_dry|shade_dry"}},
  "care_evidence_level": "visible|unknown",
  "risks": {{"shrink": "low|medium|high|unknown", "color_bleed": "low|medium|high|unknown", "deform": "low|medium|high|unknown", "pilling": "low|medium|high|unknown", "dryer_damage": "low|medium|high|unknown"}},
  "confidence": 0.0,
  "source_notes": ["what was visible"],
  "missing_fields": ["material_ratios", "care_forbidden"]
}}
care_symbols must follow common clothing-care label dimensions: wash_method, wash_temperature, bleach, tumble_dry, iron, dry_clean, natural_dry. Use canonical values only.
Allowed care_forbidden labels: do_not_bleach, do_not_tumble_dry, do_not_wash, hand_wash_only, dry_clean_only, do_not_dry_clean, do_not_iron, do_not_machine_wash, avoid_hot_water, cold_wash, low_temperature_only, wash_separately, use_laundry_bag, gentle_cycle, air_dry, flat_dry. Omit unknown labels.

Input/source context:
{source_text}
""".strip()


def build_care_inference_prompt(
    extracted_payload: dict[str, Any],
    image_type: str,
) -> str:
    """Build the third-stage prompt that fills gaps with labeled inference."""
    extracted_json = json.dumps(extracted_payload, ensure_ascii=False, sort_keys=True)
    return f"""
[CareInferenceAgent]
Responsibility: fill missing material/care/risk fields with best-effort inference.
Use the extracted facts below; do not override fields whose evidence level is visible.
Every inferred or uncertain value must be marked with evidence level inferred or uncertain.

Return JSON only:
{{
  "material_ratios": {{"cotton": 0.8, "polyester": 0.2}},
  "material_evidence_level": "inferred|uncertain|visible",
  "care_forbidden": ["do_not_bleach", "do_not_tumble_dry", "wash_separately", "use_laundry_bag"],
  "care_symbols": {{"wash_method": "machine_wash|hand_wash_only|do_not_wash", "wash_temperature": "cold|30c|40c|60c|95c", "bleach": "allowed|non_chlorine_only|do_not_bleach", "tumble_dry": "allowed|low_heat|normal_heat|high_heat|do_not_tumble_dry", "iron": "low_heat|medium_heat|high_heat|do_not_iron", "dry_clean": "allowed|dry_clean_only|do_not_dry_clean", "natural_dry": "line_dry|flat_dry|drip_dry|shade_dry"}},
  "care_evidence_level": "inferred|uncertain|visible",
  "recommended_wash": "short practical Chinese wash advice",
  "risks": {{"shrink": "low|medium|high", "color_bleed": "low|medium|high", "deform": "low|medium|high", "pilling": "low|medium|high", "dryer_damage": "low|medium|high"}},
  "confidence": 0.0,
  "source_notes": ["why the inference is reasonable"],
  "missing_fields": []
}}
care_symbols must follow common clothing-care label dimensions: wash_method, wash_temperature, bleach, tumble_dry, iron, dry_clean, natural_dry. Use canonical values only.
Allowed care_forbidden labels: do_not_bleach, do_not_tumble_dry, do_not_wash, hand_wash_only, dry_clean_only, do_not_dry_clean, do_not_iron, do_not_machine_wash, avoid_hot_water, cold_wash, low_temperature_only, wash_separately, use_laundry_bag, gentle_cycle, air_dry, flat_dry. Omit unknown labels.

Image type: {image_type}
Extracted facts:
{extracted_json}
""".strip()


def create_default_llm_client() -> LLMClient:
    """Create the default LLM client from runtime configuration."""
    api_key = os.getenv("WASHMATE_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        return LocalNoopLLMClient()

    return OpenAICompatibleLLMClient(
        api_key=api_key,
        base_url=os.getenv("WASHMATE_BASE_URL")
        or os.getenv("OPENAI_BASE_URL")
        or "https://api.openai.com/v1",
        model=os.getenv("WASHMATE_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o-mini",
    )

