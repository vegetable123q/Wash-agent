"""Campus laundry machine status interface."""

from __future__ import annotations

import json
from pathlib import Path
from typing import Any

from backend.shared.models import MachineInfo, MachineStatus, MachineType


class LaundryMachineClient:
    """Client boundary for real or mock campus laundry machine status."""

    def __init__(self, mock_path: Path | str = "data/machines_mock.json") -> None:
        self.mock_path = Path(mock_path)

    def list_machines(self) -> list[MachineInfo]:
        """Return normalized statuses for all known machines."""

        payload = self._read_payload()
        machines = payload.get("machines")
        if not isinstance(machines, list):
            raise ValueError("machine data field 'machines' must be a list")
        return [_machine_from_dict(machine) for machine in machines]

    def get_machine(self, machine_id: str) -> MachineInfo | None:
        """Return one machine by id."""

        for machine in self.list_machines():
            if machine.machine_id == machine_id:
                return machine
        return None

    def _read_payload(self) -> dict[str, Any]:
        if not self.mock_path.exists():
            raise FileNotFoundError(f"machine data file not found: {self.mock_path}")
        with self.mock_path.open("r", encoding="utf-8") as file:
            payload = json.load(file)
        if not isinstance(payload, dict):
            raise ValueError("machine data must be a JSON object")
        return payload


def _machine_from_dict(data: object) -> MachineInfo:
    if not isinstance(data, dict):
        raise ValueError("each machine record must be an object")

    allowed = {
        "machine_id",
        "location",
        "machine_type",
        "status",
        "capacity_kg",
        "remaining_minutes",
        "price_yuan",
        "modes",
    }
    unknown = set(data) - allowed
    if unknown:
        raise ValueError(f"unknown machine fields: {', '.join(sorted(unknown))}")

    required = {"machine_id", "location", "machine_type", "status"}
    missing = required - set(data)
    if missing:
        raise ValueError(f"missing required machine fields: {', '.join(sorted(missing))}")

    modes = data.get("modes", [])
    if not isinstance(modes, list):
        raise ValueError("machine modes must be a list")

    return MachineInfo(
        machine_id=str(data["machine_id"]),
        location=str(data["location"]),
        machine_type=_machine_type(data["machine_type"]),
        status=_machine_status(data["status"]),
        capacity_kg=_optional_number(data.get("capacity_kg"), "capacity_kg"),
        remaining_minutes=_optional_int(data.get("remaining_minutes"), "remaining_minutes"),
        price_yuan=_optional_number(data.get("price_yuan"), "price_yuan"),
        modes=[str(mode) for mode in modes],
    )


def _machine_type(value: object) -> MachineType:
    try:
        return MachineType(str(value))
    except ValueError as exc:
        raise ValueError(f"invalid machine_type: {value}") from exc


def _machine_status(value: object) -> MachineStatus:
    try:
        return MachineStatus(str(value))
    except ValueError as exc:
        raise ValueError(f"invalid machine status: {value}") from exc


def _optional_number(value: object, field_name: str) -> float | None:
    if value is None:
        return None
    if not isinstance(value, int | float):
        raise ValueError(f"machine {field_name} must be numeric")
    return float(value)


def _optional_int(value: object, field_name: str) -> int | None:
    if value is None:
        return None
    if not isinstance(value, int):
        raise ValueError(f"machine {field_name} must be an integer")
    return value
