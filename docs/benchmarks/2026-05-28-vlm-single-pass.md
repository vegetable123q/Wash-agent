# 2026-05-28 VLM Single-Pass Benchmark

## Setup

- Endpoint: `https://modelhub.ailemac.com/v1beta`
- Model: `gemini-3.1-pro-preview`
- Image flow: one structured `VisionExtractionAgent` call per image
- Response format: `responseMimeType=application/json` plus `responseSchema`
- Dataset: `data/pics/1..10`
- Baseline context: prior implementation used three serial VLM calls per image: image routing, typed extraction, and care inference.

## Results

| Image | Size bytes | Seconds | Status | Image type | Confidence | Missing fields |
|---|---:|---:|---|---|---:|---:|
| `data/pics/1.png` | 58118 | 22.38 | `llm_success` | `product_page` | 0.90 | 8 |
| `data/pics/2.jpeg` | 56464 | 44.69 | `llm_success` | `product_page` | 0.80 | 8 |
| `data/pics/3.png` | 253268 | 28.32 | `llm_success` | `garment_photo` | 0.50 | 8 |
| `data/pics/4.jpg` | 130560 | 30.62 | `llm_success` | `garment_photo` | 0.60 | 2 |
| `data/pics/5.jpg` | 234090 | 28.68 | `llm_success` | `garment_photo` | 0.60 | 1 |
| `data/pics/6.png` | 210457 | 28.66 | `llm_success` | `garment_photo` | 0.60 | 7 |
| `data/pics/7.jpg` | 366440 | 28.78 | `llm_success` | `mixed` | 0.95 | 1 |
| `data/pics/8.png` | 71462 | 30.87 | `llm_success` | `garment_photo` | 0.40 | 2 |
| `data/pics/9.png` | 439768 | 27.09 | `llm_success` | `garment_photo` | 0.60 | 2 |
| `data/pics/10.png` | 336730 | 28.87 | `llm_success` | `garment_photo` | 0.70 | 2 |

## Summary

- Count: 10
- Success: 10
- Total seconds: 298.96
- Average seconds: 29.90
- Median seconds: 28.73
- Min seconds: 22.38
- Max seconds: 44.69

