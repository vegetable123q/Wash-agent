"""Wardrobe persistence interface."""

from __future__ import annotations

from pathlib import Path

from .models import WardrobeItem, WashRecord


class WardrobeStore:
    """Storage boundary for wardrobe items and wash history."""

    def __init__(self, path: Path | str = "data/wardrobe_sample.json") -> None:
        self.path = Path(path)

    def list_items(self) -> list[WardrobeItem]:
        """Return all wardrobe items."""
        raise NotImplementedError

    def get_item(self, item_id: str) -> WardrobeItem | None:
        """Return one wardrobe item by id."""
        raise NotImplementedError

    def upsert_item(self, item: WardrobeItem) -> None:
        """Create or update one wardrobe item."""
        raise NotImplementedError

    def delete_item(self, item_id: str) -> None:
        """Delete one wardrobe item by id."""
        raise NotImplementedError

    def add_wash_record(self, item_id: str, record: WashRecord) -> None:
        """Append one wash history record to a wardrobe item."""
        raise NotImplementedError

