"""Product and tag information enrichment interface."""

from __future__ import annotations

from .models import ClothingInput


def enrich_product_info(raw: ClothingInput) -> ClothingInput:
    """Normalize and enrich raw product, tag, and user input."""
    raise NotImplementedError

