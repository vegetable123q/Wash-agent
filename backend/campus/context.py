"""Campus context aggregation interface."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.campus.machine_api import LaundryMachineClient
from backend.shared.models import CampusContext


def build_campus_context(
    machine_client: LaundryMachineClient,
    user_inputs: dict[str, object] | None = None,
) -> CampusContext:
    """Combine machine, weather, balcony, humidity, and pricing context."""

    inputs = user_inputs or {}
    rules_path_value = inputs.get("machine_rules_path")
    if not isinstance(rules_path_value, str) or not rules_path_value.strip():
        raise ValueError("machine_rules_path is required for campus context")

    rules = _read_rules(Path(rules_path_value))
    pricing_rules = rules.get("pricing_rules")
    if not isinstance(pricing_rules, dict):
        raise ValueError("machine rules must include pricing_rules object")

    drying_context = _object_dict(rules.get("drying_context"), "drying_context")
    drying_context.update(_object_dict(inputs.get("drying_context"), "drying_context"))

    return CampusContext(
        available_machines=machine_client.list_machines(),
        weather=_object_dict(inputs.get("weather"), "weather"),
        drying_context=drying_context,
        pricing_rules=pricing_rules,
    )


def _read_rules(path: Path) -> dict[str, Any]:
    if not path.exists():
        raise ValueError(f"pricing_rules file not found: {path}")
    with path.open("r", encoding="utf-8") as file:
        payload = json.load(file)
    if not isinstance(payload, dict):
        raise ValueError("machine rules must be a JSON object")
    return payload


def _object_dict(value: object, field_name: str) -> dict[str, Any]:
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError(f"{field_name} must be an object")
    return dict(value)
