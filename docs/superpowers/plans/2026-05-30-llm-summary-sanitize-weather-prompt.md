# LLM Summary Sanitize Weather Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep invalid live weather values such as `NaN` out of ModelHub today-advice prompts.

**Architecture:** Add a small formatter for weather prompt text in `llmSummary.ts`. `generateTodayAdvice` uses formatted live weather only when temperature, humidity, and precipitation are all finite numbers; otherwise it falls back to the existing unavailable-weather wording.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Sanitize today-advice weather prompt text

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-llm-summary-sanitize-weather-prompt.md`
- Modify: `frontend/src/api/llmSummary.test.ts`
- Modify: `frontend/src/api/llmSummary.ts`

- [x] **Step 1: Add failing weather prompt coverage**

Add a Vitest case that calls `generateTodayAdvice` with configured ModelHub and live weather containing:

```ts
{
  temperature_2m: Number.NaN,
  relative_humidity_2m: Number.NaN,
  precipitation: Number.NaN,
}
```

Assert the captured ModelHub prompt does not contain `NaN` or `undefined`.

Run from `frontend`:

```bash
npm test -- src/api/llmSummary.test.ts
```

Expected: FAIL because today advice currently interpolates raw live weather values.

- [x] **Step 2: Implement weather prompt formatter**

Add a helper like:

```ts
function weatherPromptText(weather: WeatherSnapshot | undefined): string {
  if (weather?.status !== "live" || !weather.current) return "天气信息暂不可用";
  // require finite numeric temperature, humidity, and precipitation
}
```

Use it in `generateTodayAdvice` instead of inlining raw `weather.current` fields.

- [x] **Step 3: Run target and frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/llmSummary.test.ts
npm test
```

Run from repo root:

```bash
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 4: Commit locally**

Run from repo root:

```bash
git add docs/superpowers/plans/2026-05-30-llm-summary-sanitize-weather-prompt.md frontend/src/api/llmSummary.test.ts frontend/src/api/llmSummary.ts
git commit -m "fix: sanitize today advice weather prompts"
```

Expected: one local commit. Do not push or upload.
