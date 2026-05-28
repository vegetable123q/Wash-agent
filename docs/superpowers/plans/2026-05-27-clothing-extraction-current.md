# Clothing Extraction Current Notes

This note replaces the old B-module vision extraction plan. It records the current implementation shape so future agents do not follow outdated OpenAI-compatible paths or old test names.

## Current Structure

- `backend/clothing_extraction/llm_client.py`
  - Reads only `config/api_config.json`.
  - Requires `baseUrl`, `apikey`, and `model_name`.
  - Calls ModelHub / Gemini v1beta with:

```text
POST {baseUrl}/models/{model_name}:generateContent
x-goog-api-key: {apikey}
```

  - Uses `responseMimeType=application/json`.
  - Image extraction calls also include `responseSchema` and use one `VisionExtractionAgent` prompt to return `image_type`, visible facts, conservative inference, `agent_trace`, and `missing_fields` in a single VLM request.

- `backend/clothing_extraction/product_info.py`
  - Normalizes clothing name, tag text, user notes, OCR text, product page text, supplemental sources, and manual fields into `normalized_source_text`.

- `backend/clothing_extraction/extractor.py`
  - Builds `ClothingProfile`.
  - Uses one structured VLM call for image inputs instead of separate router, typed extractor, and care inference HTTP calls.
  - Preserves explicit LLM errors in `extraction_status` and `extraction_error`.
  - Applies user manual fields when provided.
  - Does not generate hidden rule guesses when model output is missing or invalid.

- `backend/shared/models.py`
  - Owns shared dataclasses and enums used across modules.

## Current Tests

Use the renamed test module:

```bash
uv run python -m unittest tests.test_clothing_extraction -v
uv run python -m unittest discover -v
```

Do not use old references to `tests.test_b_modules`, `BModuleTests`, `OpenAICompatibleLLMClient`, `chat/completions`, `base_url`, or `api_key`.

## Package Management

The project uses `uv` only. Do not add or recreate `requirements.txt`.
