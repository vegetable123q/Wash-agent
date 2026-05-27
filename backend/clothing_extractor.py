"""Clothing profile extraction interface."""

from __future__ import annotations

from .llm_client import LLMClient
from .models import ClothingInput, ClothingProfile


def extract_clothing_info(
    raw: ClothingInput,
    llm_client: LLMClient | None = None,
) -> ClothingProfile:
    """Extract material, color, care constraints, risks, and confidence."""
    raise NotImplementedError

