"""Wash frequency recommendation implementation."""

from __future__ import annotations

import math

from backend.shared.models import FrequencyAdvice, LaundryConstraints, RiskLevel, WardrobeItem
from backend.shared.utils import contains_any, dedupe


_FREQUENCY_THRESHOLDS = {
    "underwear": 1,
    "sock": 1,
    "sport": 1,
    "sports": 1,
    "t-shirt": 2,
    "shirt": 2,
    "hoodie": 3,
    "sweater": 4,
    "wool": 4,
    "jeans": 5,
    "denim": 5,
    "pants": 4,
    "coat": 8,
    "bedding": 1,
    "内衣": 1,
    "贴身": 1,
    "袜": 1,
    "运动": 1,
    "速干": 1,
    "t恤": 2,
    "t 恤": 2,
    "衬衫": 2,
    "卫衣": 3,
    "羊毛": 4,
    "毛衣": 4,
    "牛仔": 5,
    "裤": 4,
    "外套": 8,
    "床单": 1,
    "被套": 1,
}

_LOW_FREQUENCY_TERMS = {"jeans", "denim", "sweater", "wool", "coat", "牛仔", "羊毛", "毛衣", "外套"}
_SPORT_TERMS = {"sport", "sports", "运动", "速干", "sweat", "出汗"}
_STAIN_TERMS = {"stain", "污渍", "油渍"}
_FREQUENCY_RISK_KEYS = {"shrink", "color_bleed", "deform", "pilling", "dryer_damage"}


def advise_frequency(
    item: WardrobeItem,
    constraints: LaundryConstraints,
) -> FrequencyAdvice:
    """Recommend whether and how urgently one item should be washed."""

    _validate_item(item)
    _validate_constraints(constraints)
    search_text = _search_text(item)
    threshold = _threshold_for(search_text)
    reasons: list[str] = []
    score = 0.0

    if item.wear_count_since_wash >= threshold:
        score += 45
        reasons.append(f"已穿 {item.wear_count_since_wash} 次，达到建议清洗阈值 {threshold} 次。")
    else:
        reasons.append(f"已穿 {item.wear_count_since_wash} 次，未达到建议清洗阈值 {threshold} 次。")

    if item.profile.item_id in constraints.urgent_item_ids:
        score += 25
        reasons.append("该衣物被标记为本次急用，优先级提高。")

    if contains_any(search_text, _SPORT_TERMS):
        score += 35
        reasons.append("运动后或出汗后穿着，建议及时清洗。")

    if contains_any(search_text, _STAIN_TERMS):
        score += 35
        reasons.append("用户记录有明显污渍，建议本次优先处理。")

    if contains_any(search_text, _LOW_FREQUENCY_TERMS) and item.wear_count_since_wash < threshold:
        score -= 15
        reasons.append("牛仔、羊毛或外套类衣物可适当少洗，减少褪色、缩水和变形。")

    penalty = _risk_penalty(item)
    if penalty:
        score -= penalty
        reasons.append("历史或抽取结果提示存在缩水、掉色、变形等风险，频率建议不会强行要求机洗。")

    if constraints.hygiene_sensitive and contains_any(search_text, {"underwear", "sock", "内衣", "贴身", "袜"}):
        score += 20
        reasons.append("贴身或高卫生敏感衣物，建议提高换洗频率。")

    score = max(0.0, min(score, 100.0))
    return FrequencyAdvice(
        item_id=item.profile.item_id,
        priority_score=score,
        recommendation=_recommendation(score),
        reasons=dedupe(reasons),
    )


def advise_all_frequencies(
    items: list[WardrobeItem],
    constraints: LaundryConstraints,
) -> list[FrequencyAdvice]:
    """Return frequency advice sorted by priority score, highest first."""

    _validate_items(items)
    _validate_constraints(constraints)
    return sorted(
        [advise_frequency(item, constraints) for item in items],
        key=lambda advice: advice.priority_score,
        reverse=True,
    )


def recommended_item_ids(
    items: list[WardrobeItem],
    constraints: LaundryConstraints,
    min_score: float,
) -> list[str]:
    """Return item ids whose explicit score meets min_score."""

    safe_min_score = _min_score(min_score)
    return [
        advice.item_id
        for advice in advise_all_frequencies(items, constraints)
        if advice.priority_score >= safe_min_score
    ]


def _threshold_for(text: str) -> int:
    matches = [
        threshold
        for term, threshold in _FREQUENCY_THRESHOLDS.items()
        if term in text
    ]
    if not matches:
        raise ValueError("cannot infer wash-frequency threshold from wardrobe item data")
    return min(matches)


def _validate_item(value: object) -> None:
    if not isinstance(value, WardrobeItem):
        raise ValueError("item must be a WardrobeItem")
    _non_negative_int(value.wear_count_since_wash, "wear_count_since_wash")


def _validate_items(value: object) -> None:
    if not isinstance(value, list):
        raise ValueError("items must be a list")
    for index, item in enumerate(value):
        if not isinstance(item, WardrobeItem):
            raise ValueError(f"items[{index}] must be a WardrobeItem")


def _validate_constraints(value: object) -> None:
    if not isinstance(value, LaundryConstraints):
        raise ValueError("constraints must be LaundryConstraints")
    _item_id_list(value.urgent_item_ids, "urgent_item_ids")
    _boolean(value.hygiene_sensitive, "hygiene_sensitive")


def _min_score(value: object) -> float:
    if isinstance(value, bool) or not isinstance(value, int | float):
        raise ValueError("min_score must be numeric")
    score = float(value)
    return score if math.isfinite(score) else 0.0


def _item_id_list(value: object, field_name: str) -> None:
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list of non-empty strings")
    if not all(isinstance(item, str) and item.strip() for item in value):
        raise ValueError(f"{field_name} must be a list of non-empty strings")


def _boolean(value: object, field_name: str) -> None:
    if not isinstance(value, bool):
        raise ValueError(f"{field_name} must be a boolean")


def _non_negative_int(value: object, field_name: str) -> None:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{field_name} must be a non-negative integer")
    if value < 0:
        raise ValueError(f"{field_name} must be a non-negative integer")


def _search_text(item: WardrobeItem) -> str:
    profile = item.profile
    return " ".join(
        [
            profile.name,
            profile.user_note,
            " ".join(profile.material_ratios.keys()),
            " ".join(profile.colors),
            " ".join(profile.care_forbidden),
            " ".join(profile.source_notes),
            " ".join(item.user_notes),
        ]
    ).lower()


def _risk_penalty(item: WardrobeItem) -> float:
    relevant = {
        key: level
        for key, level in item.profile.risks.items()
        if key in _FREQUENCY_RISK_KEYS
    }
    if any(level == RiskLevel.HIGH for level in relevant.values()):
        return 15.0
    if any(level == RiskLevel.MEDIUM for level in relevant.values()):
        return 8.0
    notes = " ".join(item.user_notes)
    if any(term in notes for term in ("缩水", "掉色", "起球", "shrink", "bleed", "pill")):
        return 8.0
    return 0.0


def _recommendation(score: float) -> str:
    if score >= 75:
        return "建议本次优先清洗"
    if score >= 45:
        return "建议本次清洗"
    if score >= 25:
        return "可视时间和机器情况决定是否清洗"
    return "可暂缓清洗"

