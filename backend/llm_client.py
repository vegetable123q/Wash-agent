"""LLM client interface and prompt execution boundary."""

from __future__ import annotations

from typing import Protocol

from .models import LLMResponse


class LLMClient(Protocol):
    """Protocol implemented by real or mock LLM clients."""

    def complete(self, prompt: str, *, temperature: float = 0.0) -> LLMResponse:
        """Return a normalized LLM response for a prompt."""
        raise NotImplementedError


def build_extraction_prompt(source_text: str) -> str:
    """Build the prompt used by clothing extraction."""
    raise NotImplementedError


def create_default_llm_client() -> LLMClient:
    """Create the default LLM client from runtime configuration."""
    raise NotImplementedError

