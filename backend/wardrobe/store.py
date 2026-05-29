"""Wardrobe persistence implementation."""

from __future__ import annotations

import json
from dataclasses import asdict, fields, is_dataclass
from enum import Enum
from pathlib import Path
from typing import Any

from backend.shared.models import ClothingProfile, RiskLevel, WardrobeItem, WashMethod, WashRecord


class WardrobeStore:
    """Storage boundary for wardrobe items and wash history."""

    def __init__(self, path: Path | str = "data/wardrobe_sample.json") -> None:
        self.path = Path(path)

    def list_items(self) -> list[WardrobeItem]:
        """Return all wardrobe items."""

        return [_wardrobe_item_from_dict(item) for item in self._read_items()]

    def get_item(self, item_id: str) -> WardrobeItem | None:
        """Return one wardrobe item by id."""

        for item in self.list_items():
            if item.profile.item_id == item_id:
                return item
        return None

    def upsert_item(self, item: WardrobeItem) -> None:
        """Create or update one wardrobe item."""

        items = self._read_items()
        item_dict = _to_jsonable(item)
        for index, existing in enumerate(items):
            if existing["profile"]["item_id"] == item.profile.item_id:
                items[index] = item_dict
                self._write_items(items)
                return
        items.append(item_dict)
        self._write_items(items)

    def delete_item(self, item_id: str) -> None:
        """Delete one wardrobe item by id."""

        items = self._read_items()
        kept = [item for item in items if item["profile"]["item_id"] != item_id]
        if len(kept) == len(items):
            raise KeyError(f"wardrobe item not found: {item_id}")
        self._write_items(kept)

    def add_wash_record(self, item_id: str, record: WashRecord) -> None:
        """Append one wash history record to a wardrobe item."""

        item = self.get_item(item_id)
        if item is None:
            raise KeyError(f"wardrobe item not found: {item_id}")
        item.wash_history.append(record)
        item.wear_count_since_wash = 0
        item.preferred_method = record.method
        self.upsert_item(item)

    def record_wear(self, item_id: str, count: int = 1) -> WardrobeItem:
        """Increment the wear count for a wardrobe item."""

        count = _positive_int(count, "count")
        item = self.get_item(item_id)
        if item is None:
            raise KeyError(f"wardrobe item not found: {item_id}")
        item.wear_count_since_wash += count
        self.upsert_item(item)
        return item

    def select_items(self, item_ids: list[str]) -> list[WardrobeItem]:
        """Return selected items in item_ids order."""

        items_by_id = {item.profile.item_id: item for item in self.list_items()}
        missing = [item_id for item_id in item_ids if item_id not in items_by_id]
        if missing:
            raise KeyError(f"wardrobe items not found: {', '.join(missing)}")
        return [items_by_id[item_id] for item_id in item_ids]

    def _read_items(self) -> list[dict[str, Any]]:
        if not self.path.exists():
            raise FileNotFoundError(f"wardrobe data file not found: {self.path}")
        with self.path.open("r", encoding="utf-8") as file:
            payload = json.load(file)
        if not isinstance(payload, dict) or "items" not in payload:
            raise ValueError("wardrobe data must be an object with an 'items' list")
        items = payload["items"]
        if not isinstance(items, list):
            raise ValueError("wardrobe data field 'items' must be a list")
        for index, item in enumerate(items):
            if not isinstance(item, dict):
                raise ValueError(f"items[{index}] must be an object")
        return items

    def _write_items(self, items: list[dict[str, Any]]) -> None:
        if not self.path.parent.exists():
            raise FileNotFoundError(f"wardrobe data directory not found: {self.path.parent}")
        with self.path.open("w", encoding="utf-8") as file:
            json.dump({"items": items}, file, ensure_ascii=False, indent=2)


def _wardrobe_item_from_dict(data: dict[str, Any]) -> WardrobeItem:
    _require_keys(data, {"profile", "wear_count_since_wash", "preferred_method", "wash_history", "user_notes"})
    profile = data["profile"]
    if not isinstance(profile, dict):
        raise ValueError("profile must be an object")
    return WardrobeItem(
        profile=_profile_from_dict(profile),
        wear_count_since_wash=_non_negative_int(
            data["wear_count_since_wash"],
            "wear_count_since_wash",
        ),
        preferred_method=_wash_method(data["preferred_method"], "preferred_method"),
        wash_history=_wash_history(data["wash_history"]),
        user_notes=_string_list(data["user_notes"], "user_notes"),
    )


def _profile_from_dict(data: dict[str, Any]) -> ClothingProfile:
    _require_keys(data, {"item_id", "name"})
    allowed = {field.name for field in fields(ClothingProfile)}
    unknown_keys = set(data) - allowed
    if unknown_keys:
        raise ValueError(f"unknown ClothingProfile fields: {', '.join(sorted(unknown_keys))}")
    cleaned = dict(data)
    cleaned["item_id"] = _required_text(cleaned["item_id"], "item_id")
    cleaned["name"] = _required_text(cleaned["name"], "name")
    cleaned["colors"] = _string_list(cleaned.get("colors", []), "colors")
    for field_name in (
        "care_forbidden",
        "care_warnings",
        "care_recommendations",
        "source_notes",
        "missing_fields",
        "agent_trace",
    ):
        cleaned[field_name] = _string_list(cleaned.get(field_name, []), field_name)
    for field_name in (
        "user_note",
        "image_type",
        "material_evidence_level",
        "care_evidence_level",
        "recommended_wash",
        "extraction_status",
        "extraction_error",
    ):
        if field_name in cleaned:
            cleaned[field_name] = _text(cleaned[field_name], field_name)
    cleaned["risks"] = _risk_map(cleaned.get("risks"))
    return ClothingProfile(**cleaned)


def _risk_map(value: Any) -> dict[str, RiskLevel]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError("risks must be an object")
    risks: dict[str, RiskLevel] = {}
    for key, item_value in value.items():
        if not isinstance(key, str) or not key.strip():
            raise ValueError("risks must contain non-empty string keys")
        try:
            risks[key.strip()] = RiskLevel(item_value)
        except ValueError as exc:
            raise ValueError(f"risks.{key} must be a valid risk level") from exc
    return risks


def _wash_record_from_dict(data: dict[str, Any]) -> WashRecord:
    _require_keys(data, {"washed_at", "method", "notes", "issues"})
    return WashRecord(
        washed_at=_required_text(data["washed_at"], "washed_at"),
        method=_wash_method(data["method"], "method"),
        notes=_text(data["notes"], "notes"),
        issues=_string_list(data["issues"], "issues"),
    )


def _wash_history(value: Any) -> list[WashRecord]:
    if not isinstance(value, list):
        raise ValueError("wash_history must be a list")
    records: list[WashRecord] = []
    for index, record in enumerate(value):
        if not isinstance(record, dict):
            raise ValueError(f"wash_history[{index}] must be an object")
        try:
            records.append(_wash_record_from_dict(record))
        except ValueError as exc:
            raise ValueError(f"wash_history[{index}].{exc}") from exc
    return records


def _require_keys(data: dict[str, Any], keys: set[str]) -> None:
    missing = keys - set(data)
    if missing:
        raise ValueError(f"missing required fields: {', '.join(sorted(missing))}")


def _non_negative_int(value: Any, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{field_name} must be a non-negative integer")
    if value < 0:
        raise ValueError(f"{field_name} must be a non-negative integer")
    return value


def _positive_int(value: Any, field_name: str) -> int:
    if isinstance(value, bool) or not isinstance(value, int):
        raise ValueError(f"{field_name} must be a positive integer")
    if value < 1:
        raise ValueError(f"{field_name} must be a positive integer")
    return value


def _wash_method(value: Any, field_name: str) -> WashMethod:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} must be a valid wash method")
    try:
        return WashMethod(value)
    except ValueError as exc:
        raise ValueError(f"{field_name} must be a valid wash method") from exc


def _string_list(value: Any, field_name: str) -> list[str]:
    if not isinstance(value, list):
        raise ValueError(f"{field_name} must be a list of strings")
    if not all(isinstance(item, str) for item in value):
        raise ValueError(f"{field_name} must be a list of strings")
    return list(value)


def _required_text(value: Any, field_name: str) -> str:
    if not isinstance(value, str) or not value.strip():
        raise ValueError(f"{field_name} must be a non-empty string")
    return value.strip()


def _text(value: Any, field_name: str) -> str:
    if not isinstance(value, str):
        raise ValueError(f"{field_name} must be a string")
    return value


def _to_jsonable(value: Any) -> Any:
    if isinstance(value, Enum):
        return value.value
    if is_dataclass(value):
        return {key: _to_jsonable(item) for key, item in asdict(value).items()}
    if isinstance(value, list):
        return [_to_jsonable(item) for item in value]
    if isinstance(value, dict):
        return {key: _to_jsonable(item) for key, item in value.items()}
    return value

