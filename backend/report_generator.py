"""User-facing laundry report generation interface."""

from __future__ import annotations

from .models import CampusContext, LaundryPlan, WardrobeItem, WashReport


def generate_report(
    plan: LaundryPlan,
    items: list[WardrobeItem],
    campus_context: CampusContext,
) -> WashReport:
    """Generate report sections from the final laundry plan."""
    raise NotImplementedError

