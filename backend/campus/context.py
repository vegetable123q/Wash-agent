"""Campus context aggregation interface."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.campus.machine_api import LaundryMachineClient, Transport
from backend.shared.models import (
    CampusContext,
    MachineInfo,
    MachineQueueEstimate,
    MachineStatus,
    MachineTower,
    MachineType,
)


def build_campus_context_from_user_input(
    user_inputs: dict[str, object],
    *,
    machine_rules_path: Path | str = "config/machine_rules.json",
    transport: Transport | None = None,
    timeout_seconds: float = 20.0,
) -> CampusContext:
    """Build campus context directly from page/user input."""
    if not isinstance(user_inputs, dict):
        raise ValueError("user_inputs must be an object")
    client = LaundryMachineClient(
        machine_rules_path=machine_rules_path,
        transport=transport,
        timeout_seconds=timeout_seconds,
    )
    resolved_inputs = dict(user_inputs)
    if not str(resolved_inputs.get("tower_key") or "").strip():
        tower = _resolve_tower_from_name(
            client,
            resolved_inputs,
        )
        resolved_inputs["tower_key"] = tower.tower_key
        resolved_inputs["tower_provider"] = tower.provider
        resolved_inputs["tower_keys"] = dict(tower.provider_keys)
        resolved_inputs["tower_name"] = tower.name
    return build_campus_context(
        client,
        resolved_inputs,
        machine_rules_path=machine_rules_path,
    )


def build_campus_context(
    machine_client: LaundryMachineClient,
    user_inputs: dict[str, object] | None = None,
    *,
    machine_rules_path: Path | str = "config/machine_rules.json",
) -> CampusContext:
    """Combine machine, weather, balcony, humidity, and pricing context."""
    inputs = {} if user_inputs is None else user_inputs
    if not isinstance(inputs, dict):
        raise ValueError("user_inputs must be an object")
    rules_path = _resolve_machine_rules_path(inputs, machine_rules_path, machine_client)
    tower_key = str(inputs.get("tower_key") or "").strip()
    tower_provider = str(inputs.get("tower_provider") or inputs.get("provider") or "").strip()
    tower_name = str(
        inputs.get("tower_name")
        or inputs.get("building_name")
        or inputs.get("dormitory_name")
        or inputs.get("location_name")
        or ""
    ).strip()

    weather = _optional_object(inputs, "weather")
    rules_drying_context = _normalize_drying_context(_rules_drying_context(rules_path))
    input_drying_context = _normalize_drying_context(
        _optional_object(inputs, "drying_context")
    )
    drying_context = {**rules_drying_context, **input_drying_context}
    tower_keys = _optional_string_map(inputs, "tower_keys")
    if tower_keys:
        all_machines = []
        for provider, provider_tower_key in tower_keys.items():
            all_machines.extend(
                machine_client.list_machines(
                    provider_tower_key,
                    provider=provider,
                    tower_name=tower_name,
                )
            )
    elif not tower_key and getattr(machine_client, "mock_path", None) is not None:
        all_machines = machine_client.list_machines()
    else:
        if not tower_key:
            raise ValueError("tower_key is required to build campus context")
        if not tower_provider:
            raise ValueError("tower_provider or tower_keys is required")
        all_machines = machine_client.list_machines(
            tower_key,
            provider=tower_provider,
            tower_name=tower_name,
        )
    return CampusContext(
        all_machines=all_machines,
        available_machines=[
            machine
            for machine in all_machines
            if machine.status == MachineStatus.AVAILABLE
        ],
        queue_estimates=_queue_estimates(all_machines),
        weather=weather,
        drying_context=drying_context,
        pricing_rules=_pricing_rules(rules_path),
    )


def _optional_object(inputs: dict[str, object], key: str) -> dict[str, Any]:
    value = inputs.get(key)
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError(f"{key} must be an object")
    return dict(value)


def _normalize_drying_context(value: dict[str, Any]) -> dict[str, Any]:
    normalized = dict(value)
    if "has_balcony" in normalized and "balcony_available" not in normalized:
        normalized["balcony_available"] = normalized["has_balcony"]
    return normalized


def _optional_string_map(inputs: dict[str, object], key: str) -> dict[str, str]:
    value = inputs.get(key)
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError(f"{key} must be an object")
    normalized: dict[str, str] = {}
    for map_key, map_value in value.items():
        if not isinstance(map_key, str) or not map_key.strip():
            raise ValueError(f"{key} must contain non-empty string keys and values")
        if not isinstance(map_value, str) or not map_value.strip():
            raise ValueError(f"{key} must contain non-empty string keys and values")
        normalized[map_key.strip()] = map_value.strip()
    return normalized


def _queue_estimates(machines: list[MachineInfo]) -> list[MachineQueueEstimate]:
    grouped: dict[MachineType, list[MachineInfo]] = {}
    order: list[MachineType] = []
    for machine in machines:
        if machine.machine_type not in grouped:
            grouped[machine.machine_type] = []
            order.append(machine.machine_type)
        grouped[machine.machine_type].append(machine)

    estimates: list[MachineQueueEstimate] = []
    for machine_type in order:
        typed_machines = grouped[machine_type]
        available_count = _status_count(typed_machines, MachineStatus.AVAILABLE)
        running_count = _status_count(typed_machines, MachineStatus.RUNNING)
        out_of_service_count = _status_count(
            typed_machines,
            MachineStatus.OUT_OF_SERVICE,
        )
        unknown_count = _status_count(typed_machines, MachineStatus.UNKNOWN)
        remaining_minutes = [
            machine.remaining_minutes
            for machine in typed_machines
            if machine.status == MachineStatus.RUNNING
            and _is_non_negative_int(machine.remaining_minutes)
        ]
        if available_count > 0:
            estimated_wait_minutes = 0
        elif remaining_minutes:
            estimated_wait_minutes = min(remaining_minutes)
        else:
            estimated_wait_minutes = None
        estimates.append(
            MachineQueueEstimate(
                machine_type=machine_type,
                total_count=len(typed_machines),
                available_count=available_count,
                running_count=running_count,
                out_of_service_count=out_of_service_count,
                unknown_count=unknown_count,
                estimated_wait_minutes=estimated_wait_minutes,
            )
        )
    return estimates


def _status_count(machines: list[MachineInfo], status: MachineStatus) -> int:
    return sum(1 for machine in machines if machine.status == status)


def _is_non_negative_int(value: object) -> bool:
    return isinstance(value, int) and not isinstance(value, bool) and value >= 0


def _resolve_tower_from_name(
    machine_client: LaundryMachineClient,
    inputs: dict[str, object],
) -> MachineTower:
    raw_name = (
        inputs.get("tower_name")
        or inputs.get("building_name")
        or inputs.get("dormitory_name")
        or inputs.get("location_name")
    )
    tower_name = _normalize_lookup_text(raw_name)
    if not tower_name:
        raise ValueError("tower_name or tower_key is required to build campus context")

    towers = machine_client.list_towers()
    exact_matches = [
        tower
        for tower in towers
        if _normalize_lookup_text(tower.name) == tower_name
    ]
    if len(exact_matches) == 1:
        return exact_matches[0]

    if len(exact_matches) > 1:
        names = ", ".join(tower.name for tower in exact_matches)
        raise ValueError(f"ambiguous tower_name: {raw_name}; matched {names}")
    raise ValueError(f"tower_name not found: {raw_name}")


def _normalize_lookup_text(value: object) -> str:
    return "".join(str(value or "").split()).lower()


def _resolve_machine_rules_path(
    inputs: dict[str, object],
    machine_rules_path: Path | str,
    machine_client: LaundryMachineClient,
) -> Path:
    input_path = inputs.get("machine_rules_path")
    if isinstance(input_path, str) and input_path.strip():
        return Path(input_path)
    if getattr(machine_client, "mock_path", None) is not None:
        raise ValueError("machine_rules_path is required for campus context")
    return Path(machine_rules_path)


def _pricing_rules(path: Path) -> dict[str, Any]:
    rules = _read_machine_rules(path)

    legacy_pricing = rules.get("pricing_rules", {})
    if legacy_pricing is None:
        legacy_pricing = {}
    if not isinstance(legacy_pricing, dict):
        raise ValueError("machine_rules.pricing_rules must be an object")
    pricing = rules.get("pricing", {})
    if pricing is None:
        pricing = {}
    if not isinstance(pricing, dict):
        raise ValueError("machine_rules.pricing must be an object")
    return {
        **legacy_pricing,
        **pricing,
        "washer_types": _object_rule(rules, "washer_types"),
        "dryer_modes": _object_rule(rules, "dryer_modes"),
    }


def _rules_drying_context(path: Path) -> dict[str, Any]:
    return _object_rule(_read_machine_rules(path), "drying_context")


def _read_machine_rules(path: Path) -> dict[str, Any]:
    if not path.is_file():
        raise ValueError(f"pricing_rules file not found: {path}")
    try:
        rules = json.loads(path.read_text(encoding="utf-8-sig"))
    except json.JSONDecodeError as exc:
        raise ValueError(f"Invalid JSON in machine rules file {path}: {exc}") from exc
    if not isinstance(rules, dict):
        raise ValueError(f"Machine rules root must be an object: {path}")
    return rules


def _object_rule(rules: dict[str, Any], key: str) -> dict[str, Any]:
    value = rules.get(key, {})
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError(f"machine_rules.{key} must be an object")
    return value
