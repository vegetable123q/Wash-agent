"""Legacy Streamlit entry point — no longer the primary UI.

The mobile frontend (frontend/) is the primary interface.
This file is kept for backwards compatibility.
"""

from __future__ import annotations


def run_app() -> None:
    """Placeholder — the mobile frontend in frontend/ is now the primary UI."""
    print("The primary UI is the React/Capacitor mobile frontend.")
    print("Run: cd frontend && npm run dev")


if __name__ == "__main__":
    run_app()
