"""Laundry decision and bucket planning interface."""

from __future__ import annotations

from backend.shared.models import CampusContext, LaundryConstraints, LaundryPlan, WardrobeItem


def plan_laundry(
    items: list[WardrobeItem],
    constraints: LaundryConstraints,
    campus_context: CampusContext,
) -> LaundryPlan:
    """Create wash buckets, machine modes, drying advice, and risk warnings."""
    raise NotImplementedError
