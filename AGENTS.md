# Agent Working Guide

This file is the first reference for any agent working in this repository. Follow it before adding files, moving code, or changing module boundaries.

## Package Management

- Use `uv` for all Python dependency and command execution work.
- Add dependencies with `uv add <package>`.
- Remove dependencies with `uv remove <package>`.
- Sync the environment with `uv sync`.
- Run Python commands through `uv run`, for example `uv run python -m unittest discover -v`.
- Do not install project dependencies with `pip install` or maintain a separate requirements workflow unless the user explicitly asks for it.

## Directory Ownership

### Page and App Entry

Use:

- `app.py` — legacy Streamlit entry point, no longer the primary UI.
- `main.py` — minimal CLI entry point.

The primary UI is the React/Capacitor mobile frontend in `frontend/`. Do not put LLM prompts, extraction rules, machine parsing, wardrobe persistence, planning rules, or report generation in app.py or main.py.

### Shared Contracts

Use:

- `backend/shared/models.py`

Put dataclasses, enums, and cross-module data contracts here. This is the only shared model layer. If a field is only useful inside one module, keep it inside that module instead of adding it to shared models.

### Clothing Extraction

Use:

- `backend/clothing_extraction/llm_client.py`
- `backend/clothing_extraction/product_info.py`
- `backend/clothing_extraction/extractor.py`

Put ModelHub / Gemini v1beta client code, prompt construction, image payload handling, product/tag/OCR text normalization, and clothing profile extraction here. Do not put wardrobe storage, washing frequency advice, campus machine logic, laundry planning, or report text here.

### Wardrobe Memory

Use:

- `backend/wardrobe/store.py`
- `backend/wardrobe/frequency_advisor.py`
- `data/wardrobe_sample.json`

Put wardrobe CRUD, wash history, wear counts, historical issues, and frequency advice here. Do not call LLMs or read campus machine state from this package.

### Campus Context

Use:

- `backend/campus/machine_api.py`
- `backend/campus/context.py`
- `backend/campus/weather.py`
- `data/machines_mock.json`
- `config/machine_rules.json`

Put laundry machine status parsing, machine configuration, price/time/capacity rules, weather or drying context, and campus-level context assembly here. Do not put garment material risk logic or final report wording here.

### Local Mobile API

The mobile frontend (frontend/) is self-contained: wardrobe management, campus context, laundry planning, report generation, and frequency advice all run as TypeScript services within the APK. Only ModelHub image recognition requires user-provided API credentials. The Python backend modules serve as the reference implementation and test oracle.

### Laundry Planning

Use:

- `backend/laundry/planner.py`

Put wash method decisions, bucket splitting, machine mode selection, detergent amounts, laundry bag decisions, drying method choices, and risk warnings here. Do not call LLMs, read page state, or generate final user-facing report sections here.

### Reports

Use:

- `backend/reports/generator.py`

Put user-facing report assembly here. Convert `LaundryPlan`, wardrobe items, and campus context into `WashReport`. Do not mutate plans, fetch machines, or call LLMs here.

### Tests and Docs

Use:

- `tests/` for automated tests.
- `docs/` for design notes and implementation documentation.
- `README.md` for stable user-facing setup and run instructions.

When changing module structure, directory ownership, public interfaces, shared models, configuration behavior, or the main workflow, update `docs/structure_design.md` in the same change. Do not leave architecture docs behind the code.

## Import Rules

- Import shared contracts from `backend.shared.models`.
- Import clothing extraction from `backend.clothing_extraction.*`.
- Import wardrobe code from `backend.wardrobe.*`.
- Import campus code from `backend.campus.*`.
- Import laundry planning from `backend.laundry.*`.
- Import reports from `backend.reports.*`.
- Do not recreate old flat imports such as `backend.models`, `backend.llm_client`, or `backend.clothing_extractor`.
- Do not add compatibility wrapper modules for old paths.

## Reuse Rules

- Search for an existing model, helper, prompt builder, parser, or client before adding a new one.
- Prefer extending a focused existing module over creating a parallel implementation.
- Keep changes small and local to the owning directory.
- If a change crosses directories, pass data through `backend/shared/models.py` contracts rather than ad hoc dictionaries.
- Do not duplicate dataclasses or enums in module-specific files.

## Simplicity Rules

- Write the smallest implementation that satisfies the current request.
- Avoid broad refactors unless the user asks for them or the current task requires them.
- Avoid speculative abstractions, unused hooks, and future-only configuration.
- Keep module names and function names direct.

## No Fallback or Default Logic

- Do not add fallback behavior, default behavior, silent guesses, compatibility shims, or hidden substitutions.
- If required input, config, service output, or model output is missing, make that state explicit through a status field, error field, or raised exception.
- Do not invent material, color, risk, machine, weather, price, or plan data when the source is absent.
- Do not mask API failures by returning guessed business results.
- Existing explicit error statuses may be preserved, but new work should not expand fallback or default paths.

## Verification

- Run focused tests after changing a module.
- Run the full suite before handing off broad path or shared model changes:

```bash
uv run python -m unittest discover -v
```
