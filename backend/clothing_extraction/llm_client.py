"""LLM client interface and prompt execution boundary."""

from __future__ import annotations

import base64
import json
import mimetypes
import urllib.error
import urllib.parse
import urllib.request
from dataclasses import dataclass
from pathlib import Path
from typing import Any
from typing import Protocol

from backend.shared.models import LLMResponse

_SUPPORTED_IMAGE_MIME_TYPES = {"image/jpeg", "image/png", "image/webp"}
_CONFIG_PATH = Path("config/api_config.json")


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


def _image_ref_to_url(image_ref: str) -> str:
    if image_ref.startswith(("http://", "https://", "data:image/")):
        return image_ref
    path = Path(image_ref)
    mime_type = mimetypes.guess_type(path.name)[0]
    if mime_type not in _SUPPORTED_IMAGE_MIME_TYPES:
        raise ValueError(f"Unsupported image type for {path.name}: {mime_type}")
    encoded = base64.b64encode(path.read_bytes()).decode("ascii")
    return f"data:{mime_type};base64,{encoded}"


def _build_gemini_parts(
    prompt: str,
    image_refs: list[str] | None,
) -> list[dict[str, Any]]:
    parts: list[dict[str, Any]] = [{"text": prompt}]
    for image_ref in image_refs or []:
        image_url = _image_ref_to_url(image_ref)
        if not image_url.startswith("data:image/"):
            raise ValueError(f"Unsupported Gemini image reference: {image_ref}")
        metadata, encoded = image_url.split(",", 1)
        mime_type = metadata.removeprefix("data:").removesuffix(";base64")
        parts.append(
            {
                "inline_data": {
                    "mime_type": mime_type,
                    "data": encoded,
                }
            }
        )
    return parts


@dataclass(slots=True)
class GeminiV1BetaLLMClient:
    """Gemini v1beta generateContent client for modelhub-style endpoints."""

    apikey: str
    base_url: str
    model: str
    timeout_seconds: float = 60.0

    def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        image_refs: list[str] | None = None,
    ) -> LLMResponse:
        """Call a Gemini v1beta generateContent endpoint and normalize failures."""
        model_path = urllib.parse.quote(self.model.removeprefix("models/"), safe="")
        endpoint = f"{self.base_url.rstrip('/')}/models/{model_path}:generateContent"

        try:
            payload = {
                "systemInstruction": {
                    "parts": [
                        {
                            "text": (
                                "You extract clothing care facts from text and images "
                                "and return JSON only."
                            )
                        }
                    ]
                },
                "contents": [
                    {
                        "role": "user",
                        "parts": _build_gemini_parts(prompt, image_refs),
                    }
                ],
                "generationConfig": {
                    "temperature": temperature,
                    "responseMimeType": "application/json",
                },
            }
            request = urllib.request.Request(
                endpoint,
                data=json.dumps(payload).encode("utf-8"),
                headers={
                    "Content-Type": "application/json",
                    "x-goog-api-key": self.apikey,
                },
                method="POST",
            )
            with urllib.request.urlopen(request, timeout=self.timeout_seconds) as response:
                raw_text = response.read().decode("utf-8")
            raw: dict[str, Any] = json.loads(raw_text)
            parts = (
                raw.get("candidates", [{}])[0]
                .get("content", {})
                .get("parts", [])
            )
            content = "".join(
                str(part.get("text", ""))
                for part in parts
                if isinstance(part, dict)
            )
            return LLMResponse(
                text=content or "{}",
                provider="gemini-v1beta",
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
                provider="gemini-v1beta",
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
  "care_symbol_evidence": {{"wash_method": "visible|inferred|uncertain", "wash_temperature": "visible|inferred|uncertain", "bleach": "visible|inferred|uncertain", "tumble_dry": "visible|inferred|uncertain", "iron": "visible|inferred|uncertain", "dry_clean": "visible|inferred|uncertain", "natural_dry": "visible|inferred|uncertain"}},
  "risks": {{"shrink": "low|medium|high|unknown", "color_bleed": "low|medium|high|unknown", "deform": "low|medium|high|unknown", "pilling": "low|medium|high|unknown", "dryer_damage": "low|medium|high|unknown"}},
  "confidence": 0.0,
  "source_notes": ["简短说明信息来自哪里"],
  "missing_fields": ["material_ratios", "colors", "care_forbidden"]
}}

规则：
- material_ratios 使用英文小写材质键，比例为 0 到 1；不知道比例时给合理估计。
- colors 使用英文小写颜色词；深色可用 "dark"，浅色可用 "light"。
- care_symbols 按常见水洗标维度输出：wash_method、wash_temperature、bleach、tumble_dry、iron、dry_clean、natural_dry；只输出能看见或能合理推断的维度。
- care_symbol_evidence 必须为 care_symbols 中的每个维度标注 visible、inferred 或 uncertain。
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
  "care_symbol_evidence": {{"wash_method": "visible|inferred|uncertain", "wash_temperature": "visible|inferred|uncertain", "bleach": "visible|inferred|uncertain", "tumble_dry": "visible|inferred|uncertain", "iron": "visible|inferred|uncertain", "dry_clean": "visible|inferred|uncertain", "natural_dry": "visible|inferred|uncertain"}},
  "care_evidence_level": "visible|unknown",
  "risks": {{"shrink": "low|medium|high|unknown", "color_bleed": "low|medium|high|unknown", "deform": "low|medium|high|unknown", "pilling": "low|medium|high|unknown", "dryer_damage": "low|medium|high|unknown"}},
  "confidence": 0.0,
  "source_notes": ["what was visible"],
  "missing_fields": ["material_ratios", "care_forbidden"]
}}
care_symbols must follow common clothing-care label dimensions: wash_method, wash_temperature, bleach, tumble_dry, iron, dry_clean, natural_dry. Use canonical values only.
care_symbol_evidence must include one visible|inferred|uncertain value for every emitted care_symbols key.
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
  "care_symbol_evidence": {{"wash_method": "visible|inferred|uncertain", "wash_temperature": "visible|inferred|uncertain", "bleach": "visible|inferred|uncertain", "tumble_dry": "visible|inferred|uncertain", "iron": "visible|inferred|uncertain", "dry_clean": "visible|inferred|uncertain", "natural_dry": "visible|inferred|uncertain"}},
  "care_evidence_level": "inferred|uncertain|visible",
  "recommended_wash": "short practical Chinese wash advice",
  "risks": {{"shrink": "low|medium|high", "color_bleed": "low|medium|high", "deform": "low|medium|high", "pilling": "low|medium|high", "dryer_damage": "low|medium|high"}},
  "confidence": 0.0,
  "source_notes": ["why the inference is reasonable"],
  "missing_fields": []
}}
care_symbols must follow common clothing-care label dimensions: wash_method, wash_temperature, bleach, tumble_dry, iron, dry_clean, natural_dry. Use canonical values only.
care_symbol_evidence must include one visible|inferred|uncertain value for every emitted care_symbols key.
Allowed care_forbidden labels: do_not_bleach, do_not_tumble_dry, do_not_wash, hand_wash_only, dry_clean_only, do_not_dry_clean, do_not_iron, do_not_machine_wash, avoid_hot_water, cold_wash, low_temperature_only, wash_separately, use_laundry_bag, gentle_cycle, air_dry, flat_dry. Omit unknown labels.

Image type: {image_type}
Extracted facts:
{extracted_json}
""".strip()


def _read_api_config() -> dict[str, str]:
    config_path = _CONFIG_PATH
    if not config_path.is_file():
        raise FileNotFoundError(f"Missing API config file: {config_path}")
    try:
        raw = json.loads(config_path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in {config_path}: {exc}") from exc
    if not isinstance(raw, dict):
        raise ValueError(f"API config root must be an object: {config_path}")
    return {str(key): str(value) for key, value in raw.items() if value is not None}


def _required_config_value(config: dict[str, str], key: str) -> str:
    value = config.get(key, "").strip()
    if not value:
        raise ValueError(f"Missing required config/api_config.json field: {key}")
    return value


def create_configured_llm_client() -> LLMClient:
    """Create the configured Gemini v1beta client from config/api_config.json."""
    config = _read_api_config()
    return GeminiV1BetaLLMClient(
        apikey=_required_config_value(config, "apikey"),
        base_url=_required_config_value(config, "baseUrl"),
        model=_required_config_value(config, "model_name"),
    )
