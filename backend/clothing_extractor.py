"""Clothing profile extraction interface."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from .llm_client import LLMClient, build_extraction_prompt, create_default_llm_client
from .models import ClothingInput, ClothingProfile, RiskLevel, WardrobeItem
from .product_info import enrich_product_info


_MATERIAL_ALIASES: dict[str, tuple[str, ...]] = {
    "cotton": ("棉", "cotton"),
    "polyester": ("聚酯", "涤纶", "polyester"),
    "wool": ("羊毛", "wool"),
    "silk": ("真丝", "蚕丝", "silk"),
    "spandex": ("氨纶", "弹性纤维", "spandex", "elastane"),
    "nylon": ("锦纶", "尼龙", "nylon"),
    "linen": ("亚麻", "linen"),
    "down": ("羽绒", "down"),
    "denim": ("牛仔", "denim"),
}

_COLOR_ALIASES: dict[str, tuple[str, ...]] = {
    "white": ("白", "white"),
    "black": ("黑", "black"),
    "gray": ("灰", "grey", "gray"),
    "blue": ("蓝", "blue"),
    "red": ("红", "red"),
    "green": ("绿", "green"),
    "yellow": ("黄", "yellow"),
    "pink": ("粉", "pink"),
    "dark": ("深色", "深", "dark"),
    "light": ("浅色", "浅", "light"),
}

_CARE_FORBIDDEN_PATTERNS: tuple[tuple[str, tuple[str, ...]], ...] = (
    ("do_not_bleach", ("不可漂白", "不能漂白", "no bleach")),
    ("do_not_tumble_dry", ("不可烘干", "不能烘干", "禁止烘干", "no tumble dry")),
    ("do_not_wash", ("不可水洗", "不能水洗", "do not wash")),
    ("hand_wash_only", ("手洗", "hand wash")),
    ("dry_clean_only", ("干洗", "dry clean")),
    ("low_temperature_only", ("低温", "冷水", "low heat", "cold wash")),
)

_USER_FILL_SUGGESTIONS = {
    "material_ratios": "请补充吊牌材质成分，例如 棉 80%、聚酯纤维 20%。",
    "colors": "请补充衣物主色和深浅，例如 black、blue、dark。",
    "care_forbidden": "请补充洗护禁忌，例如 不可漂白、不可烘干、只能手洗。",
}


def _profile_id(source_text: str) -> str:
    digest = hashlib.sha1(source_text.encode("utf-8")).hexdigest()[:12]
    return f"cloth-{digest}"


def _parse_json_object(text: str) -> dict[str, Any]:
    stripped = text.strip()
    if not stripped:
        return {}
    fence_match = re.search(r"```(?:json)?\s*(.*?)```", stripped, flags=re.S | re.I)
    if fence_match:
        stripped = fence_match.group(1).strip()
    object_match = re.search(r"\{.*\}", stripped, flags=re.S)
    if not object_match:
        return {}
    try:
        parsed = json.loads(object_match.group(0))
    except json.JSONDecodeError:
        return {}
    return parsed if isinstance(parsed, dict) else {}


def _normalize_ratio(value: Any) -> float | None:
    try:
        ratio = float(value)
    except (TypeError, ValueError):
        return None
    if ratio > 1:
        ratio = ratio / 100
    if ratio < 0:
        return None
    return min(ratio, 1.0)


def _extract_materials(source_text: str) -> dict[str, float]:
    materials: dict[str, float] = {}
    lower = source_text.lower()

    for material, aliases in _MATERIAL_ALIASES.items():
        for alias in aliases:
            escaped = re.escape(alias)
            patterns = (
                rf"{escaped}(?:纤维)?\s*(\d+(?:\.\d+)?)\s*%?",
                rf"{escaped}[^0-9%]{{0,4}}(\d+(?:\.\d+)?)\s*%?",
                rf"(\d+(?:\.\d+)?)\s*%?\s*{escaped}",
            )
            for pattern in patterns:
                match = re.search(pattern, lower, flags=re.I)
                if match:
                    ratio = _normalize_ratio(match.group(1))
                    if ratio is not None:
                        materials[material] = ratio
                        break
            if material in materials:
                break
        if material in materials:
            continue
        if any(alias.lower() in lower for alias in aliases):
            materials[material] = 0.6 if "混纺" in source_text and material == "cotton" else 1.0

    if "混纺" in source_text and materials == {"cotton": 0.6}:
        materials["polyester"] = 0.4

    total = sum(materials.values())
    if total > 1.05:
        materials = {key: round(value / total, 3) for key, value in materials.items()}
    return materials


def _extract_colors(source_text: str) -> list[str]:
    color_source = re.sub(
        r"不可漂白|不能漂白|禁止漂白|不要漂白|漂白|no bleach",
        " ",
        source_text,
        flags=re.I,
    )
    lower = color_source.lower()
    colors: list[str] = []
    for color, aliases in _COLOR_ALIASES.items():
        if any(alias.lower() in lower for alias in aliases):
            colors.append(color)
    return colors


def _extract_care_forbidden(source_text: str) -> list[str]:
    lower = source_text.lower()
    forbidden: list[str] = []
    for code, aliases in _CARE_FORBIDDEN_PATTERNS:
        if any(alias.lower() in lower for alias in aliases):
            forbidden.append(code)
    return forbidden


def _risk_level(value: Any) -> RiskLevel:
    if isinstance(value, RiskLevel):
        return value
    try:
        return RiskLevel(str(value).lower())
    except ValueError:
        return RiskLevel.UNKNOWN


def _extract_risks(source_text: str) -> dict[str, RiskLevel]:
    text = source_text.lower()
    risks = {
        "shrink": RiskLevel.UNKNOWN,
        "color_bleed": RiskLevel.UNKNOWN,
        "deform": RiskLevel.UNKNOWN,
        "pilling": RiskLevel.UNKNOWN,
        "dryer_damage": RiskLevel.UNKNOWN,
    }

    if any(word in source_text for word in ("缩水", "缩小")) or "shrink" in text:
        risks["shrink"] = RiskLevel.HIGH
    elif any(word in source_text for word in ("棉", "羊毛", "真丝")):
        risks["shrink"] = RiskLevel.MEDIUM

    if any(word in source_text for word in ("掉色", "褪色", "串色", "深色", "牛仔")):
        risks["color_bleed"] = RiskLevel.HIGH

    if any(word in source_text for word in ("变形", "拉伸", "羊毛", "真丝", "针织")):
        risks["deform"] = RiskLevel.HIGH

    if any(word in source_text for word in ("起球", "毛球", "羊毛", "混纺")):
        risks["pilling"] = RiskLevel.MEDIUM

    if any(word in source_text for word in ("高温烘干", "不可烘干", "不能烘干", "烘坏")):
        risks["dryer_damage"] = RiskLevel.HIGH
    elif any(word in source_text for word in ("棉", "羊毛", "真丝")):
        risks["dryer_damage"] = RiskLevel.MEDIUM

    return risks


def _missing_fields_for_profile(profile: ClothingProfile) -> list[str]:
    missing: list[str] = []
    if not profile.material_ratios:
        missing.append("material_ratios")
    if not profile.colors:
        missing.append("colors")
    if not profile.care_forbidden:
        missing.append("care_forbidden")
    return missing


def _with_missing_fields(
    profile: ClothingProfile,
    requested: list[str] | None = None,
) -> ClothingProfile:
    computed = _missing_fields_for_profile(profile)
    computed_set = set(computed)
    still_relevant_requested = [
        field
        for field in requested or []
        if field in computed_set or field not in _USER_FILL_SUGGESTIONS
    ]
    missing = list(dict.fromkeys([*still_relevant_requested, *computed]))
    profile.missing_fields[:] = missing
    profile.user_fill_suggestions.clear()
    profile.user_fill_suggestions.update(
        {
            field: _USER_FILL_SUGGESTIONS[field]
            for field in missing
            if field in _USER_FILL_SUGGESTIONS
        }
    )
    return profile


def _apply_manual_fields(
    profile: ClothingProfile,
    manual_fields: Any,
) -> ClothingProfile:
    if not isinstance(manual_fields, dict) or not manual_fields:
        return profile

    applied = False
    name = manual_fields.get("name")
    if isinstance(name, str) and name.strip():
        profile.name = name.strip()
        applied = True

    user_note = manual_fields.get("user_note")
    if isinstance(user_note, str) and user_note.strip():
        profile.user_note = user_note.strip()
        applied = True

    material_ratios = manual_fields.get("material_ratios")
    if isinstance(material_ratios, dict):
        normalized = {
            str(key).lower(): ratio
            for key, value in material_ratios.items()
            if (ratio := _normalize_ratio(value)) is not None
        }
        if normalized:
            profile.material_ratios = normalized
            applied = True

    colors = manual_fields.get("colors")
    if isinstance(colors, list):
        normalized_colors = [
            str(color).lower()
            for color in colors
            if str(color).strip()
        ]
        if normalized_colors:
            profile.colors = normalized_colors
            applied = True

    care_forbidden = manual_fields.get("care_forbidden")
    if isinstance(care_forbidden, list):
        normalized_forbidden = [
            str(item)
            for item in care_forbidden
            if str(item).strip()
        ]
        if normalized_forbidden:
            profile.care_forbidden = normalized_forbidden
            applied = True

    risks = manual_fields.get("risks")
    if isinstance(risks, dict):
        profile.risks.update(
            {str(key): _risk_level(value) for key, value in risks.items()}
        )
        applied = True

    if applied:
        profile.confidence = max(profile.confidence, 0.9)
        profile.source_notes.append("manual user fields applied")
    return profile


def _fallback_profile(raw: ClothingInput, notes: list[str]) -> ClothingProfile:
    source_text = raw.extra.get("normalized_source_text") or "\n".join(
        part
        for part in (raw.name, raw.shop_name, raw.tag_text, raw.user_description)
        if part
    )
    materials = _extract_materials(source_text)
    colors = _extract_colors(source_text)
    care_forbidden = _extract_care_forbidden(source_text)
    risks = _extract_risks(source_text)

    known_fields = sum(bool(value) for value in (materials, colors, care_forbidden))
    confidence = min(0.72, 0.35 + known_fields * 0.12)

    source_notes = list(raw.extra.get("source_notes", []))
    source_notes.extend(notes)
    if not materials:
        source_notes.append("material not found by rule fallback")

    return ClothingProfile(
        item_id=_profile_id(source_text or raw.name),
        name=raw.name or "未命名衣物",
        user_note=str(
            raw.user_note or raw.extra.get("user_note") or raw.user_description or ""
        ).strip(),
        material_ratios=materials,
        colors=colors,
        care_forbidden=care_forbidden,
        risks=risks,
        confidence=round(confidence, 2),
        source_notes=source_notes,
    )


def _profile_from_llm(raw: ClothingInput, payload: dict[str, Any]) -> ClothingProfile | None:
    if not payload:
        return None

    source_text = raw.extra.get("normalized_source_text") or raw.name
    fallback = _fallback_profile(raw, ["rule fallback merged with LLM output"])

    material_ratios = {
        str(key).lower(): ratio
        for key, value in dict(payload.get("material_ratios") or {}).items()
        if (ratio := _normalize_ratio(value)) is not None
    }
    risks = {
        str(key): _risk_level(value)
        for key, value in dict(payload.get("risks") or {}).items()
    }
    for key, value in fallback.risks.items():
        risks.setdefault(key, value)

    try:
        confidence = float(payload.get("confidence", fallback.confidence))
    except (TypeError, ValueError):
        confidence = fallback.confidence

    llm_missing = [str(field) for field in payload.get("missing_fields") or []]
    profile = ClothingProfile(
        item_id=_profile_id(source_text),
        name=str(payload.get("name") or raw.name or fallback.name),
        user_note=fallback.user_note,
        material_ratios=material_ratios or fallback.material_ratios,
        colors=[str(color).lower() for color in payload.get("colors") or fallback.colors],
        care_forbidden=[
            str(item) for item in payload.get("care_forbidden") or fallback.care_forbidden
        ],
        risks=risks,
        confidence=max(fallback.confidence, min(confidence, 1.0)),
        source_notes=[
            str(note)
            for note in payload.get("source_notes")
            or fallback.source_notes
        ],
    )
    return _with_missing_fields(profile, llm_missing)


def _complete_with_optional_images(
    client: LLMClient,
    prompt: str,
    image_refs: list[str],
) -> Any:
    kwargs: dict[str, Any] = {"temperature": 0.0}
    if image_refs:
        kwargs["image_refs"] = image_refs
    try:
        return client.complete(prompt, **kwargs)
    except TypeError as exc:
        if "image_refs" in kwargs and "image_refs" in str(exc):
            return client.complete(prompt, temperature=0.0)
        raise


def extract_clothing_info(
    raw: ClothingInput,
    llm_client: LLMClient | None = None,
) -> ClothingProfile:
    """Extract material, color, care constraints, risks, and confidence."""
    enriched = enrich_product_info(raw)
    source_text = enriched.extra.get("normalized_source_text", enriched.name)
    client = llm_client or create_default_llm_client()
    prompt = build_extraction_prompt(source_text)

    try:
        response = _complete_with_optional_images(client, prompt, enriched.image_refs)
    except Exception as exc:
        profile = _fallback_profile(enriched, [f"LLM unavailable: {exc}"])
        profile = _apply_manual_fields(profile, enriched.extra.get("manual_fields"))
        return _with_missing_fields(profile, profile.missing_fields)

    payload = _parse_json_object(response.text)
    profile = _profile_from_llm(enriched, payload)
    if profile is not None:
        profile = _apply_manual_fields(profile, enriched.extra.get("manual_fields"))
        return _with_missing_fields(profile, profile.missing_fields)

    notes = ["LLM returned no usable JSON; rule fallback used"]
    if response.raw.get("error"):
        notes.append(f"LLM unavailable: {response.raw['error']}")
    elif response.provider == "local-fallback":
        notes.append("LLM unavailable: no API key configured")
    profile = _fallback_profile(enriched, notes)
    profile = _apply_manual_fields(profile, enriched.extra.get("manual_fields"))
    return _with_missing_fields(profile, profile.missing_fields)


def build_wardrobe_item(
    profile: ClothingProfile,
    user_note: str | None = None,
) -> WardrobeItem:
    """Prepare an extracted profile for the C wardrobe module."""
    note = (user_note if user_note is not None else profile.user_note).strip()
    return WardrobeItem(
        profile=profile,
        user_notes=[note] if note else [],
    )

