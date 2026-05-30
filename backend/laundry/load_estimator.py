"""Washing machine load estimation and capacity-based splitting.

Mirrors the frontend laundryLoad.ts so that backend and APK use the same
capacity rules.  The washing machine API does not expose drum capacity,
so we estimate load units from clothing type and split buckets accordingly.
"""

from __future__ import annotations

from backend.shared.models import WardrobeItem
from backend.shared.utils import contains_any

WASHER_LOAD_UNITS = 100
TARGET_WASHER_LOAD_UNITS = 85

# (terms, load_units) — order matters: first match wins.
_LOAD_RULES: list[tuple[set[str], int]] = [
    ({"床单", "被套", "床品", "duvet", "sheet", "bedding"}, 65),
    ({"羽绒", "棉服", "大衣", "coat", "down"}, 36),
    ({"外套", "夹克", "jacket"}, 28),
    ({"卫衣", "hoodie", "sweatshirt"}, 22),
    ({"牛仔", "长裤", "裤", "jeans", "pants", "trousers"}, 18),
    ({"毛巾", "浴巾", "towel"}, 18),
    ({"内衣", "袜", "underwear", "socks", "sock"}, 5),
]

_DEFAULT_LOAD_UNITS = 10


def estimate_load_units(item: WardrobeItem) -> int:
    """Return estimated washer load units for one wardrobe item."""
    text = _item_search_text(item)
    for terms, units in _LOAD_RULES:
        if contains_any(text, terms):
            return units
    return _DEFAULT_LOAD_UNITS


def total_load_units(items: list[WardrobeItem]) -> int:
    """Return total estimated load units for a list of items."""
    return sum(estimate_load_units(item) for item in items)


def load_percent(items: list[WardrobeItem]) -> int:
    """Return load percentage capped at 100."""
    return min(100, total_load_units(items))


def estimated_washer_load_count(
    items: list[WardrobeItem],
    target_units: int = TARGET_WASHER_LOAD_UNITS,
) -> int:
    """Return how many washer loads are needed for these items."""
    total = total_load_units(items)
    if total <= 0:
        return 0
    return max(1, -(-total // target_units))  # ceil division


def split_items_by_load(
    items: list[WardrobeItem],
    target_units: int = TARGET_WASHER_LOAD_UNITS,
) -> list[list[WardrobeItem]]:
    """Split items into chunks that each fit within *target_units*."""
    chunks: list[list[WardrobeItem]] = []
    current: list[WardrobeItem] = []
    current_units = 0

    for item in items:
        item_units = estimate_load_units(item)
        if current and current_units + item_units > target_units:
            chunks.append(current)
            current = []
            current_units = 0
        current.append(item)
        current_units += item_units

    if current:
        chunks.append(current)
    return chunks if chunks else [[]] if items else []


def _item_search_text(item: WardrobeItem) -> str:
    profile = item.profile
    return " ".join(
        [
            profile.name,
            profile.user_note,
            " ".join(profile.material_ratios.keys()),
            " ".join(profile.colors),
            " ".join(profile.care_forbidden),
            " ".join(profile.source_notes),
            " ".join(item.user_notes),
        ]
    ).lower()
