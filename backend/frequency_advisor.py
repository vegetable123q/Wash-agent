"""Wash frequency recommendation interface."""

from __future__ import annotations

from .models import FrequencyAdvice, LaundryConstraints, WardrobeItem


def advise_frequency(
    item: WardrobeItem,
    constraints: LaundryConstraints,
) -> FrequencyAdvice:
    """Recommend whether and how urgently one item should be washed."""
    raise NotImplementedError

