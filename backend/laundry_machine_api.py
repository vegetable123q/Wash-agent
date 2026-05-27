"""Campus laundry machine status interface."""

from __future__ import annotations

from pathlib import Path

from .models import MachineInfo


class LaundryMachineClient:
    """Client boundary for real or mock campus laundry machine status."""

    def __init__(self, mock_path: Path | str = "data/machines_mock.json") -> None:
        self.mock_path = Path(mock_path)

    def list_machines(self) -> list[MachineInfo]:
        """Return normalized statuses for all known machines."""
        raise NotImplementedError

    def get_machine(self, machine_id: str) -> MachineInfo | None:
        """Return one machine by id."""
        raise NotImplementedError

