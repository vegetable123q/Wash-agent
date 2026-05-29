"""Shared utility functions used across backend modules."""

from __future__ import annotations


def dedupe(items: list[str]) -> list[str]:
    """Remove duplicate strings while preserving order."""
    return list(dict.fromkeys(items))


def contains_any(text: str, terms: set[str]) -> bool:
    """Return True if *text* contains any of the given *terms*."""
    return any(term in text for term in terms)
