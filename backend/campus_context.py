"""Campus context aggregation interface."""

from __future__ import annotations

from .laundry_machine_api import LaundryMachineClient
from .models import CampusContext


def build_campus_context(
    machine_client: LaundryMachineClient,
    user_inputs: dict[str, object] | None = None,
) -> CampusContext:
    """Combine machine, weather, balcony, humidity, and pricing context."""
    raise NotImplementedError

