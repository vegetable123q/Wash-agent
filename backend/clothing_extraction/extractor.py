"""Clothing profile extraction interface."""

from __future__ import annotations

import hashlib
import json
import re
from typing import Any

from .llm_client import (
    LLMClient,
    build_care_inference_prompt,
    build_extraction_prompt,
    build_image_router_prompt,
    build_typed_extraction_prompt,
    create_configured_llm_client,
)
from backend.shared.models import ClothingInput, ClothingProfile, RiskLevel, WardrobeItem
from .product_info import enrich_product_info


_USER_FILL_SUGGESTIONS = {
    "material_ratios": "请补充吊牌材质成分，例如 棉 80%、聚酯纤维 20%。",
    "colors": "请补充衣物主色和深浅，例如 black、blue、dark。",
    "care_forbidden": "请补充洗护禁忌，例如 不可漂白、不可烘干、只能手洗。",
}

_CANONICAL_CARE_LABELS = {
    "air_dry",
    "avoid_hot_water",
    "cold_wash",
    "do_not_bleach",
    "do_not_dry_clean",
    "do_not_iron",
    "do_not_machine_wash",
    "do_not_tumble_dry",
    "do_not_wash",
    "dry_clean_only",
    "flat_dry",
    "gentle_cycle",
    "hand_wash_only",
    "low_temperature_only",
    "use_laundry_bag",
    "wash_separately",
}

_CARE_WARNING_LABELS = {
    "avoid_hot_water",
    "do_not_bleach",
    "do_not_dry_clean",
    "do_not_iron",
    "do_not_machine_wash",
    "do_not_tumble_dry",
    "do_not_wash",
    "dry_clean_only",
    "hand_wash_only",
    "low_temperature_only",
}

_CARE_RECOMMENDATION_LABELS = {
    "air_dry",
    "cold_wash",
    "flat_dry",
    "gentle_cycle",
    "use_laundry_bag",
    "wash_separately",
}

_CARE_LABEL_ALIASES = {
    "bleach": "do_not_bleach",
    "no_bleach": "do_not_bleach",
    "no bleach": "do_not_bleach",
    "not_bleach": "do_not_bleach",
    "不可漂白": "do_not_bleach",
    "tumble_dry": "do_not_tumble_dry",
    "no_tumble_dry": "do_not_tumble_dry",
    "no tumble dry": "do_not_tumble_dry",
    "do not tumble dry": "do_not_tumble_dry",
    "not_tumble_dry": "do_not_tumble_dry",
    "不可烘干": "do_not_tumble_dry",
    "不能烘干": "do_not_tumble_dry",
    "wash_with_hot_water": "avoid_hot_water",
    "hot_wash": "avoid_hot_water",
    "hot water": "avoid_hot_water",
    "avoid hot water": "avoid_hot_water",
    "避免热水": "avoid_hot_water",
    "cold water": "cold_wash",
    "cold wash": "cold_wash",
    "laundry_bag": "use_laundry_bag",
    "use laundry bag": "use_laundry_bag",
    "use_laundry_net": "use_laundry_bag",
    "洗衣袋": "use_laundry_bag",
    "separate_wash": "wash_separately",
    "wash separately": "wash_separately",
    "separate colors": "wash_separately",
    "分开洗": "wash_separately",
    "gentle wash": "gentle_cycle",
    "gentle": "gentle_cycle",
    "gentle_cycle_only": "gentle_cycle",
    "line dry": "air_dry",
    "hang dry": "air_dry",
    "dry in shade": "air_dry",
    "shade dry": "air_dry",
    "hand wash": "hand_wash_only",
    "handwash": "hand_wash_only",
    "手洗": "hand_wash_only",
    "no iron": "do_not_iron",
    "no_iron": "do_not_iron",
    "不可熨烫": "do_not_iron",
    "no dry clean": "do_not_dry_clean",
    "no_dry_clean": "do_not_dry_clean",
    "不可干洗": "do_not_dry_clean",
    "no machine wash": "do_not_machine_wash",
    "no_machine_wash": "do_not_machine_wash",
    "不可机洗": "do_not_machine_wash",
    "flat dry": "flat_dry",
    "dry flat": "flat_dry",
    "平摊晾干": "flat_dry",
}

_CARE_SYMBOL_ALIASES = {
    "wash_method": {
        "machine_wash": "machine_wash",
        "machine wash": "machine_wash",
        "normal_wash": "machine_wash",
        "hand_wash": "hand_wash_only",
        "hand wash": "hand_wash_only",
        "hand_wash_only": "hand_wash_only",
        "do_not_wash": "do_not_wash",
        "no wash": "do_not_wash",
        "do not wash": "do_not_wash",
    },
    "wash_temperature": {
        "cold": "cold",
        "cold_wash": "cold",
        "30": "30c",
        "30c": "30c",
        "30 c": "30c",
        "30°c": "30c",
        "30℃": "30c",
        "40": "40c",
        "40c": "40c",
        "40 c": "40c",
        "40°c": "40c",
        "40℃": "40c",
        "60": "60c",
        "60c": "60c",
        "60 c": "60c",
        "60°c": "60c",
        "60℃": "60c",
        "95": "95c",
        "95c": "95c",
        "95 c": "95c",
        "95°c": "95c",
        "95℃": "95c",
    },
    "bleach": {
        "allowed": "allowed",
        "bleach_allowed": "allowed",
        "do_not_bleach": "do_not_bleach",
        "bleach": "do_not_bleach",
        "no bleach": "do_not_bleach",
        "non_chlorine_only": "non_chlorine_only",
        "non chlorine only": "non_chlorine_only",
    },
    "tumble_dry": {
        "allowed": "allowed",
        "tumble_dry": "allowed",
        "low_heat": "low_heat",
        "low tumble dry": "low_heat",
        "low_temperature": "low_heat",
        "normal_heat": "normal_heat",
        "medium_heat": "normal_heat",
        "high_heat": "high_heat",
        "do_not_tumble_dry": "do_not_tumble_dry",
        "no tumble dry": "do_not_tumble_dry",
    },
    "iron": {
        "low_heat": "low_heat",
        "low iron": "low_heat",
        "medium_heat": "medium_heat",
        "medium iron": "medium_heat",
        "high_heat": "high_heat",
        "high iron": "high_heat",
        "do_not_iron": "do_not_iron",
        "no iron": "do_not_iron",
    },
    "dry_clean": {
        "allowed": "allowed",
        "dry_clean": "allowed",
        "dry_clean_only": "dry_clean_only",
        "do_not_dry_clean": "do_not_dry_clean",
        "no dry clean": "do_not_dry_clean",
    },
    "natural_dry": {
        "line_dry": "line_dry",
        "line dry": "line_dry",
        "flat_dry": "flat_dry",
        "dry flat": "flat_dry",
        "drip_dry": "drip_dry",
        "drip dry": "drip_dry",
        "shade_dry": "shade_dry",
        "dry in shade": "shade_dry",
    },
}

_CARE_SYMBOL_FORBIDDEN = {
    ("wash_method", "hand_wash_only"): "hand_wash_only",
    ("wash_method", "do_not_wash"): "do_not_wash",
    ("wash_temperature", "cold"): "low_temperature_only",
    ("wash_temperature", "30c"): "avoid_hot_water",
    ("bleach", "do_not_bleach"): "do_not_bleach",
    ("tumble_dry", "do_not_tumble_dry"): "do_not_tumble_dry",
    ("iron", "do_not_iron"): "do_not_iron",
    ("dry_clean", "do_not_dry_clean"): "do_not_dry_clean",
    ("dry_clean", "dry_clean_only"): "dry_clean_only",
    ("natural_dry", "flat_dry"): "flat_dry",
}


def _profile_id(source_text: str) -> str:
    digest = hashlib.sha1(source_text.encode("utf-8")).hexdigest()[:12]
    return f"cloth-{digest}"


def _parse_json_object(text: str) -> tuple[dict[str, Any], str]:
    stripped = text.strip()
    if not stripped:
        return {}, "Empty LLM response"
    fence_match = re.search(r"```(?:json)?\s*(.*?)```", stripped, flags=re.S | re.I)
    if fence_match:
        stripped = fence_match.group(1).strip()
    object_match = re.search(r"\{.*\}", stripped, flags=re.S)
    if not object_match:
        return {}, "No JSON object found in LLM response"
    try:
        parsed = json.loads(object_match.group(0))
    except json.JSONDecodeError as exc:
        return {}, f"Invalid JSON returned by LLM: {exc}"
    if not isinstance(parsed, dict):
        return {}, "LLM JSON root is not an object"
    return parsed, ""


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


def _risk_level(value: Any) -> RiskLevel:
    if isinstance(value, RiskLevel):
        return value
    try:
        return RiskLevel(str(value).lower())
    except ValueError:
        return RiskLevel.UNKNOWN


def _evidence_level(value: Any) -> str:
    normalized = str(value or "unknown").strip().lower()
    if normalized in {"visible", "inferred", "uncertain", "unknown"}:
        return normalized
    return "unknown"


def _image_type(value: Any) -> str:
    normalized = str(value or "unknown").strip().lower()
    allowed = {
        "garment_photo",
        "care_label",
        "tag_photo",
        "product_page",
        "mixed",
        "low_quality",
        "unknown",
    }
    return normalized if normalized in allowed else "unknown"


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    return [str(item) for item in value if str(item).strip()]


def _canonical_care_label(value: Any) -> str:
    raw = str(value or "").strip()
    if not raw:
        return ""
    normalized = re.sub(r"[\s\-]+", "_", raw.lower())
    spaced = normalized.replace("_", " ")
    if normalized in _CANONICAL_CARE_LABELS:
        return normalized
    return _CARE_LABEL_ALIASES.get(raw.lower()) or _CARE_LABEL_ALIASES.get(spaced, "")


def _normalize_care_labels(value: Any) -> list[str]:
    labels: list[str] = []
    seen: set[str] = set()
    for item in _string_list(value):
        label = _canonical_care_label(item)
        if label and label not in seen:
            labels.append(label)
            seen.add(label)
    return labels


def _split_care_labels(labels: list[str]) -> tuple[list[str], list[str]]:
    warnings: list[str] = []
    recommendations: list[str] = []
    warning_seen: set[str] = set()
    recommendation_seen: set[str] = set()
    for label in labels:
        if label in _CARE_WARNING_LABELS and label not in warning_seen:
            warnings.append(label)
            warning_seen.add(label)
        elif label in _CARE_RECOMMENDATION_LABELS and label not in recommendation_seen:
            recommendations.append(label)
            recommendation_seen.add(label)
    return warnings, recommendations


def _canonical_care_symbol(category: str, value: Any) -> str:
    token = str(value or "").strip().lower()
    if not token:
        return ""
    if category == "wash_temperature":
        token = token.replace("°", "").replace("℃", "c")
        token = re.sub(r"\s+", "", token)
    else:
        token = re.sub(r"[\s\-]+", "_", token)
    aliases = _CARE_SYMBOL_ALIASES.get(category, {})
    if token in aliases:
        return aliases[token]
    return aliases.get(token.replace("_", " "), "")


def _normalize_care_symbols(value: Any) -> dict[str, str]:
    if not isinstance(value, dict):
        return {}
    normalized: dict[str, str] = {}
    for category, raw_value in value.items():
        key = str(category).strip().lower()
        if key not in _CARE_SYMBOL_ALIASES:
            continue
        symbol = _canonical_care_symbol(key, raw_value)
        if symbol:
            normalized[key] = symbol
    return normalized


def _normalize_care_symbol_evidence(
    value: Any,
    care_symbols: dict[str, str],
    overall_evidence_level: str,
) -> dict[str, str]:
    source = value if isinstance(value, dict) else {}
    inherited_level = _evidence_level(overall_evidence_level)
    evidence: dict[str, str] = {}
    for category in care_symbols:
        level = _evidence_level(source.get(category))
        evidence[category] = level if level != "unknown" else inherited_level
    return evidence


def _care_forbidden_from_symbols(care_symbols: dict[str, str]) -> list[str]:
    return [
        forbidden
        for item in care_symbols.items()
        if (forbidden := _CARE_SYMBOL_FORBIDDEN.get(item))
    ]


def _visible_symbol_conflicts(category: str, symbol: str) -> set[str]:
    if category == "bleach" and symbol in {"allowed", "non_chlorine_only"}:
        return {"do_not_bleach"}
    if category == "tumble_dry" and symbol in {
        "allowed",
        "low_heat",
        "normal_heat",
        "high_heat",
    }:
        return {"do_not_tumble_dry"}
    if category == "iron" and symbol in {"low_heat", "medium_heat", "high_heat"}:
        return {"do_not_iron"}
    if category == "dry_clean" and symbol in {"allowed", "dry_clean_only"}:
        return {"do_not_dry_clean"}
    if category == "dry_clean" and symbol == "do_not_dry_clean":
        return {"dry_clean_only"}
    if category == "wash_method" and symbol == "machine_wash":
        return {"do_not_machine_wash", "do_not_wash", "hand_wash_only"}
    if category == "wash_method" and symbol == "do_not_wash":
        return {"hand_wash_only", "do_not_machine_wash"}
    return set()


def _drop_conflicting_inferred_actions(
    profile: ClothingProfile,
    labels: list[str],
) -> list[str]:
    manual_action_keys = {"care_forbidden", "care_warnings", "care_recommendations"}
    if any(profile.field_sources.get(key) == "manual_fields" for key in manual_action_keys):
        return labels

    conflicting: set[str] = set()
    for category, symbol in profile.care_symbols.items():
        if profile.care_symbol_evidence.get(category) == "visible":
            conflicting.update(_visible_symbol_conflicts(category, symbol))
    if not conflicting:
        return labels
    return [label for label in labels if label not in conflicting]


def _sync_care_actions(profile: ClothingProfile) -> ClothingProfile:
    labels: list[str] = []
    _extend_unique(labels, profile.care_forbidden)
    _extend_unique(labels, profile.care_warnings)
    _extend_unique(labels, profile.care_recommendations)
    _extend_unique(labels, _care_forbidden_from_symbols(profile.care_symbols))
    labels = _drop_conflicting_inferred_actions(profile, labels)
    warnings, recommendations = _split_care_labels(labels)
    profile.care_warnings[:] = warnings
    profile.care_recommendations[:] = recommendations
    profile.care_forbidden[:] = [*warnings, *recommendations]
    return profile


def _unknown_risks() -> dict[str, RiskLevel]:
    return {
        "shrink": RiskLevel.UNKNOWN,
        "color_bleed": RiskLevel.UNKNOWN,
        "deform": RiskLevel.UNKNOWN,
        "pilling": RiskLevel.UNKNOWN,
        "dryer_damage": RiskLevel.UNKNOWN,
    }


def _missing_fields_for_profile(profile: ClothingProfile) -> list[str]:
    missing: list[str] = []
    if not _has_known_material(profile.material_ratios):
        missing.append("material_ratios")
    if not profile.colors:
        missing.append("colors")
    if not profile.care_forbidden:
        missing.append("care_forbidden")
    return missing


def _has_known_material(material_ratios: dict[str, float]) -> bool:
    return any(
        material != "unknown" and ratio > 0
        for material, ratio in material_ratios.items()
    )


def _with_missing_fields(
    profile: ClothingProfile,
    requested: list[str] | None = None,
) -> ClothingProfile:
    _sync_care_actions(profile)
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
            profile.material_evidence_level = "visible"
            profile.field_sources["material_ratios"] = "manual_fields"
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
        normalized_forbidden = _normalize_care_labels(care_forbidden)
        if normalized_forbidden:
            profile.care_forbidden = normalized_forbidden
            profile.care_evidence_level = "visible"
            profile.field_sources["care_forbidden"] = "manual_fields"
            applied = True

    care_warnings = _normalize_care_labels(manual_fields.get("care_warnings"))
    if care_warnings:
        profile.care_warnings = [
            label for label in care_warnings if label in _CARE_WARNING_LABELS
        ]
        profile.care_evidence_level = "visible"
        profile.field_sources["care_warnings"] = "manual_fields"
        applied = True

    care_recommendations = _normalize_care_labels(
        manual_fields.get("care_recommendations")
    )
    if care_recommendations:
        profile.care_recommendations = [
            label
            for label in care_recommendations
            if label in _CARE_RECOMMENDATION_LABELS
        ]
        profile.care_evidence_level = "visible"
        profile.field_sources["care_recommendations"] = "manual_fields"
        applied = True

    care_symbols = _normalize_care_symbols(manual_fields.get("care_symbols"))
    if care_symbols:
        profile.care_symbols.update(care_symbols)
        profile.care_symbol_evidence.update(
            {category: "visible" for category in care_symbols}
        )
        profile.care_evidence_level = "visible"
        profile.field_sources["care_symbols"] = "manual_fields"
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


def _empty_profile(
    raw: ClothingInput,
    *,
    extraction_status: str,
    extraction_error: str = "",
    notes: list[str] | None = None,
) -> ClothingProfile:
    source_text = raw.extra.get("normalized_source_text") or raw.name
    source_notes = list(raw.extra.get("source_notes", []))
    source_notes.extend(notes or [])
    return ClothingProfile(
        item_id=_profile_id(source_text or raw.name),
        name=raw.name or "未命名衣物",
        user_note=str(
            raw.user_note or raw.extra.get("user_note") or raw.user_description or ""
        ).strip(),
        risks=_unknown_risks(),
        confidence=0.0,
        source_notes=source_notes,
        extraction_status=extraction_status,
        extraction_error=extraction_error,
    )


def _profile_from_llm(raw: ClothingInput, payload: dict[str, Any]) -> ClothingProfile | None:
    if not payload:
        return None

    source_text = raw.extra.get("normalized_source_text") or raw.name

    material_ratios = {
        str(key).lower(): ratio
        for key, value in dict(payload.get("material_ratios") or {}).items()
        if (ratio := _normalize_ratio(value)) is not None
    }
    risks = _unknown_risks()
    risks.update({
        str(key): _risk_level(value)
        for key, value in dict(payload.get("risks") or {}).items()
    })

    try:
        confidence = float(payload.get("confidence", 0.0))
    except (TypeError, ValueError):
        confidence = 0.0

    llm_missing = [str(field) for field in payload.get("missing_fields") or []]
    care_symbols = _normalize_care_symbols(payload.get("care_symbols"))
    care_evidence_level = _evidence_level(payload.get("care_evidence_level"))
    care_warnings = [
        label
        for label in _normalize_care_labels(payload.get("care_warnings"))
        if label in _CARE_WARNING_LABELS
    ]
    care_recommendations = [
        label
        for label in _normalize_care_labels(payload.get("care_recommendations"))
        if label in _CARE_RECOMMENDATION_LABELS
    ]
    profile = ClothingProfile(
        item_id=_profile_id(source_text),
        name=str(payload.get("name") or raw.name or "未命名衣物"),
        user_note=str(
            raw.user_note or raw.extra.get("user_note") or raw.user_description or ""
        ).strip(),
        material_ratios=material_ratios,
        colors=[str(color).lower() for color in payload.get("colors") or []],
        care_forbidden=_normalize_care_labels(payload.get("care_forbidden")),
        care_warnings=care_warnings,
        care_recommendations=care_recommendations,
        risks=risks,
        confidence=max(0.0, min(confidence, 1.0)),
        source_notes=[
            str(note)
            for note in payload.get("source_notes")
            or raw.extra.get("source_notes", [])
            or ["LLM returned usable JSON"]
        ],
        image_type=_image_type(payload.get("image_type")),
        care_symbols=care_symbols,
        care_symbol_evidence=_normalize_care_symbol_evidence(
            payload.get("care_symbol_evidence"),
            care_symbols,
            care_evidence_level,
        ),
        material_evidence_level=_evidence_level(
            payload.get("material_evidence_level")
        ),
        care_evidence_level=care_evidence_level,
        recommended_wash=str(payload.get("recommended_wash") or ""),
        field_sources={
            str(key): str(value)
            for key, value in dict(payload.get("field_sources") or {}).items()
        },
        agent_trace=_string_list(payload.get("agent_trace")),
        extraction_status="llm_success",
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
    return client.complete(prompt, **kwargs)


_PROFILE_PAYLOAD_KEYS = {
    "name",
    "material_ratios",
    "colors",
    "care_forbidden",
    "care_warnings",
    "care_recommendations",
    "care_symbols",
    "risks",
    "missing_fields",
}


def _payload_has_profile_fields(payload: dict[str, Any]) -> bool:
    return bool(_PROFILE_PAYLOAD_KEYS.intersection(payload))


def _payload_confidence(payload: dict[str, Any]) -> float:
    try:
        return max(0.0, min(float(payload.get("confidence", 0.0)), 1.0))
    except (TypeError, ValueError):
        return 0.0


def _extend_unique(target: list[str], values: list[str]) -> None:
    seen = set(target)
    for value in values:
        if value not in seen:
            target.append(value)
            seen.add(value)


def _merge_inference_payload(
    profile: ClothingProfile,
    payload: dict[str, Any],
) -> ClothingProfile:
    material_ratios = {
        str(key).lower(): ratio
        for key, value in dict(payload.get("material_ratios") or {}).items()
        if (ratio := _normalize_ratio(value)) is not None
    }
    material_evidence = _evidence_level(payload.get("material_evidence_level"))
    if material_ratios and profile.material_evidence_level != "visible":
        profile.material_ratios = material_ratios
        profile.material_evidence_level = material_evidence
        profile.field_sources["material_ratios"] = "care_inference"

    care_forbidden = _normalize_care_labels(payload.get("care_forbidden"))
    care_warnings = [
        label
        for label in _normalize_care_labels(payload.get("care_warnings"))
        if label in _CARE_WARNING_LABELS
    ]
    care_recommendations = [
        label
        for label in _normalize_care_labels(payload.get("care_recommendations"))
        if label in _CARE_RECOMMENDATION_LABELS
    ]
    care_evidence = _evidence_level(payload.get("care_evidence_level"))
    if care_forbidden and profile.care_evidence_level != "visible":
        if profile.care_forbidden:
            _extend_unique(profile.care_forbidden, care_forbidden)
        else:
            profile.care_forbidden = care_forbidden
        profile.care_evidence_level = care_evidence
        profile.field_sources["care_forbidden"] = "care_inference"

    if (care_warnings or care_recommendations) and profile.care_evidence_level != "visible":
        _extend_unique(profile.care_warnings, care_warnings)
        _extend_unique(profile.care_recommendations, care_recommendations)
        profile.care_evidence_level = care_evidence
        profile.field_sources["care_actions"] = "care_inference"

    care_symbols = _normalize_care_symbols(payload.get("care_symbols"))
    if care_symbols:
        care_symbol_evidence = _normalize_care_symbol_evidence(
            payload.get("care_symbol_evidence"),
            care_symbols,
            care_evidence,
        )
        for category, symbol in care_symbols.items():
            if profile.care_evidence_level != "visible" or category not in profile.care_symbols:
                profile.care_symbols[category] = symbol
                profile.care_symbol_evidence[category] = care_symbol_evidence[category]
        if profile.care_evidence_level != "visible":
            profile.care_evidence_level = care_evidence
        profile.field_sources["care_symbols"] = "care_inference"

    risks = payload.get("risks")
    if isinstance(risks, dict):
        profile.risks.update(
            {str(key): _risk_level(value) for key, value in risks.items()}
        )
        profile.field_sources["risks"] = "care_inference"

    if payload.get("recommended_wash"):
        profile.recommended_wash = str(payload["recommended_wash"])
        profile.field_sources["recommended_wash"] = "care_inference"

    _extend_unique(profile.source_notes, _string_list(payload.get("source_notes")))
    profile.confidence = max(profile.confidence, _payload_confidence(payload))
    return _with_missing_fields(
        profile,
        [str(field) for field in payload.get("missing_fields") or profile.missing_fields],
    )


def _profile_from_image_agents(
    enriched: ClothingInput,
    client: LLMClient,
    source_text: str,
) -> ClothingProfile:
    router_response = _complete_with_optional_images(
        client,
        build_image_router_prompt(source_text),
        enriched.image_refs,
    )
    router_payload, router_error = _parse_json_object(router_response.text)
    if router_error:
        profile = _empty_profile(
            enriched,
            extraction_status="llm_invalid_json",
            extraction_error=router_error,
            notes=[f"ImageRouterAgent failed: {router_error}"],
        )
        profile.agent_trace.append("image_router")
        return _with_missing_fields(profile, profile.missing_fields)

    if not router_payload:
        if router_response.raw.get("error"):
            error = str(router_response.raw["error"])
            profile = _empty_profile(
                enriched,
                extraction_status="llm_error",
                extraction_error=error,
                notes=[f"ImageRouterAgent unavailable: {error}"],
            )
        else:
            profile = _empty_profile(
                enriched,
                extraction_status="llm_empty_response",
                extraction_error="ImageRouterAgent returned empty JSON",
                notes=["ImageRouterAgent returned empty JSON"],
            )
        profile.agent_trace.append("image_router")
        return _with_missing_fields(profile, profile.missing_fields)

    if not router_payload.get("image_type") and _payload_has_profile_fields(router_payload):
        profile = _profile_from_llm(enriched, router_payload)
        if profile is None:
            profile = _empty_profile(
                enriched,
                extraction_status="llm_empty_response",
                extraction_error="LLM returned no usable fields",
                notes=["Legacy vision response contained no usable fields"],
            )
        return profile

    image_type = _image_type(router_payload.get("image_type"))
    extraction_response = _complete_with_optional_images(
        client,
        build_typed_extraction_prompt(source_text, image_type),
        enriched.image_refs,
    )
    extraction_payload, extraction_error = _parse_json_object(extraction_response.text)
    if extraction_error:
        profile = _empty_profile(
            enriched,
            extraction_status="llm_invalid_json",
            extraction_error=extraction_error,
            notes=[f"TypedExtractionAgent failed: {extraction_error}"],
        )
        profile.image_type = image_type
        profile.agent_trace.extend(["image_router", "typed_extractor"])
        return _with_missing_fields(profile, profile.missing_fields)

    extraction_payload["image_type"] = image_type
    profile = _profile_from_llm(enriched, extraction_payload)
    if profile is None:
        profile = _empty_profile(
            enriched,
            extraction_status="llm_empty_response",
            extraction_error="TypedExtractionAgent returned no usable fields",
            notes=["TypedExtractionAgent returned no usable fields"],
        )
        profile.image_type = image_type
    profile.agent_trace[:] = ["image_router", "typed_extractor"]
    _extend_unique(profile.source_notes, _string_list(router_payload.get("source_notes")))

    if profile.material_ratios and profile.material_evidence_level == "visible":
        profile.field_sources["material_ratios"] = "typed_extractor"
    if profile.care_forbidden and profile.care_evidence_level == "visible":
        profile.field_sources["care_forbidden"] = "typed_extractor"

    inference_response = _complete_with_optional_images(
        client,
        build_care_inference_prompt(extraction_payload, image_type),
        enriched.image_refs,
    )
    inference_payload, inference_error = _parse_json_object(inference_response.text)
    profile.agent_trace.append("care_inference")
    if inference_error:
        profile.source_notes.append(f"CareInferenceAgent failed: {inference_error}")
        return _with_missing_fields(profile, profile.missing_fields)
    return _merge_inference_payload(profile, inference_payload)


def extract_clothing_info(
    raw: ClothingInput,
    llm_client: LLMClient | None = None,
) -> ClothingProfile:
    """Extract material, color, care constraints, risks, and confidence."""
    enriched = enrich_product_info(raw)
    source_text = enriched.extra.get("normalized_source_text", enriched.name)
    client = llm_client or create_configured_llm_client()
    if enriched.image_refs:
        try:
            profile = _profile_from_image_agents(enriched, client, source_text)
        except Exception as exc:
            profile = _empty_profile(
                enriched,
                extraction_status="llm_error",
                extraction_error=str(exc),
                notes=[f"LLM unavailable: {exc}; deterministic rules were not used"],
            )
        profile = _apply_manual_fields(profile, enriched.extra.get("manual_fields"))
        return _with_missing_fields(profile, profile.missing_fields)

    prompt = build_extraction_prompt(source_text)

    try:
        response = _complete_with_optional_images(client, prompt, enriched.image_refs)
    except Exception as exc:
        profile = _empty_profile(
            enriched,
            extraction_status="llm_error",
            extraction_error=str(exc),
            notes=[f"LLM unavailable: {exc}; deterministic rules were not used"],
        )
        profile = _apply_manual_fields(profile, enriched.extra.get("manual_fields"))
        return _with_missing_fields(profile, profile.missing_fields)

    payload, parse_error = _parse_json_object(response.text)
    if parse_error:
        profile = _empty_profile(
            enriched,
            extraction_status="llm_invalid_json",
            extraction_error=parse_error,
            notes=[f"{parse_error}; deterministic rules were not used"],
        )
        profile = _apply_manual_fields(profile, enriched.extra.get("manual_fields"))
        return _with_missing_fields(profile, profile.missing_fields)

    if not payload:
        if response.raw.get("error"):
            status = "llm_error"
            error = str(response.raw["error"])
            note = f"LLM unavailable: {error}; deterministic rules were not used"
        else:
            status = "llm_empty_response"
            error = "LLM returned an empty JSON object"
            note = "LLM returned empty JSON; deterministic rules were not used"
        profile = _empty_profile(
            enriched,
            extraction_status=status,
            extraction_error=error,
            notes=[note],
        )
        profile = _apply_manual_fields(profile, enriched.extra.get("manual_fields"))
        return _with_missing_fields(profile, profile.missing_fields)

    profile = _profile_from_llm(enriched, payload)
    if profile is not None:
        profile = _apply_manual_fields(profile, enriched.extra.get("manual_fields"))
        return _with_missing_fields(profile, profile.missing_fields)

    profile = _empty_profile(
        enriched,
        extraction_status="llm_empty_response",
        extraction_error="LLM returned no usable fields",
        notes=["LLM returned no usable fields; deterministic rules were not used"],
    )
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
