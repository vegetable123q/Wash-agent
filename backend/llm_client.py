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
class LocalFallbackLLMClient:
    """No-network client used when no API key is configured."""

    provider: str = "local-fallback"
    model: str = "rule-based"

    def complete(
        self,
        prompt: str,
        *,
        temperature: float = 0.0,
        image_refs: list[str] | None = None,
    ) -> LLMResponse:
        """Return empty JSON so callers can fall back to deterministic rules."""
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
  "risks": {{"shrink": "low|medium|high|unknown", "color_bleed": "low|medium|high|unknown", "deform": "low|medium|high|unknown", "pilling": "low|medium|high|unknown", "dryer_damage": "low|medium|high|unknown"}},
  "confidence": 0.0,
  "source_notes": ["简短说明信息来自哪里"],
  "missing_fields": ["material_ratios", "colors", "care_forbidden"]
}}

规则：
- material_ratios 使用英文小写材质键，比例为 0 到 1；不知道比例时给合理估计。
- colors 使用英文小写颜色词；深色可用 "dark"，浅色可用 "light"。
- care_forbidden 使用英文 snake_case，例如 do_not_bleach、do_not_tumble_dry、hand_wash_only、dry_clean_only。
- risks 的等级只能是 low、medium、high、unknown。
- confidence 为 0 到 1。
- 如果输入包含衣服照片、吊牌照片或淘宝/商品页截图，请同时读取图片中的款式、颜色、材质成分、洗护图标和商品页文案。
- 对图片或文字中没有、且不能可靠推断的信息，不要编造；把字段名放入 missing_fields，供用户手填。
- 如果用户手填字段与图片/文字冲突，优先保留用户手填字段，并在 source_notes 说明。
- 商品名、商品页文字和图片只用于补全材质/洗护信息，不要输出店铺、购买链接、价格或推荐语。

输入：
{source_text}
""".strip()


def create_default_llm_client() -> LLMClient:
    """Create the default LLM client from runtime configuration."""
    api_key = os.getenv("WASHMATE_API_KEY") or os.getenv("OPENAI_API_KEY")
    if not api_key:
        return LocalFallbackLLMClient()

    return OpenAICompatibleLLMClient(
        api_key=api_key,
        base_url=os.getenv("WASHMATE_BASE_URL")
        or os.getenv("OPENAI_BASE_URL")
        or "https://api.openai.com/v1",
        model=os.getenv("WASHMATE_MODEL") or os.getenv("OPENAI_MODEL") or "gpt-4o-mini",
    )

