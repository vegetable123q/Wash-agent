"""Product and tag information enrichment interface."""

from __future__ import annotations

import json
import re
from dataclasses import replace
from typing import Any

from backend.shared.models import ClothingInput


def _normalize_text(value: str) -> str:
    """Collapse user-entered whitespace without changing meaning."""
    return re.sub(r"\s+", " ", value or "").strip()


def _string_list(value: Any) -> list[str]:
    if not isinstance(value, list):
        return []
    items: list[str] = []
    for item in value:
        if not isinstance(item, str):
            continue
        text = _normalize_text(item)
        if text:
            items.append(text)
    return items


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

    supplemental_sources = extra.get("supplemental_sources") or []
    if not isinstance(supplemental_sources, list):
        return parts

    for index, source in enumerate(supplemental_sources, start=1):
        if isinstance(source, dict):
            text_value = source.get("text")
            if not isinstance(text_value, str):
                continue
            name_value = source.get("source")
            name = (
                _normalize_text(name_value)
                if isinstance(name_value, str)
                else f"补充来源{index}"
            )
            text = _normalize_text(text_value)
            if text:
                parts.append(f"{name}: {text}")
        elif isinstance(source, str):
            text = _normalize_text(source)
            if text:
                parts.append(f"补充来源{index}: {text}")
    return parts


def enrich_product_info(raw: ClothingInput) -> ClothingInput:
    """Normalize and enrich raw product, tag, and user input."""
    name = _normalize_text(raw.name)
    shop_name = _normalize_text(raw.shop_name)
    tag_text = _normalize_text(raw.tag_text)
    user_note = _normalize_text(
        str(raw.user_note or raw.extra.get("user_note") or raw.user_description)
    )
    extra = dict(raw.extra)
    supplemental_parts = _iter_supplemental_sources(extra)
    manual_fields = (
        extra.get("manual_fields") if isinstance(extra.get("manual_fields"), dict) else {}
    )

    source_parts: list[str] = []
    if name:
        source_parts.append(f"商品名: {name}")
    if tag_text:
        source_parts.append(f"吊牌/洗护标签: {tag_text}")
    if user_note:
        source_parts.append(f"用户备注: {user_note}")
    if raw.image_refs:
        source_parts.append("图片引用: " + ", ".join(raw.image_refs))
    source_parts.extend(supplemental_parts)
    if manual_fields:
        source_parts.append(
            "用户手填字段: "
            + json.dumps(manual_fields, ensure_ascii=False, sort_keys=True)
        )

    source_notes = _string_list(raw.extra.get("source_notes", []))
    if tag_text:
        source_notes.append("包含吊牌或洗护标签文字")
    if name:
        source_notes.append("包含衣物名称信息")
    if user_note:
        source_notes.append("包含用户备注")
    if supplemental_parts:
        source_notes.append("包含图片/OCR/商品页等补充来源")
    if manual_fields:
        source_notes.append("包含用户手填字段")
    if not source_notes:
        source_notes.append("仅有基础衣物名称")

    extra["normalized_source_text"] = "\n".join(source_parts)
    extra["source_notes"] = source_notes
    extra["user_note"] = user_note

    return replace(
        raw,
        name=name,
        shop_name=shop_name,
        tag_text=tag_text,
        user_description=user_note,
        user_note=user_note,
        extra=extra,
    )
