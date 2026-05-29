# Validate Weather Current Values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Treat Open-Meteo responses with nonnumeric current weather values as unavailable instead of live.

**Architecture:** Add focused tests for the weather adapter. Keep validation local to `fetchTsinghuaWeather` by checking the numeric fields that the app renders and uses for drying advice.

**Tech Stack:** TypeScript, Vitest, fetch-stubbed weather adapter.

---

### Task 1: Validate Current Weather Values

**Files:**
- Create: `frontend/src/api/weatherService.test.ts`
- Modify: `frontend/src/api/weatherService.ts`

- [ ] **Step 1: Write the failing test**

Create `frontend/src/api/weatherService.test.ts`:

```ts
import { beforeEach, describe, expect, it, vi } from "vitest";
import { fetchTsinghuaWeather } from "./weatherService";

describe("fetchTsinghuaWeather", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("returns unavailable when current weather values are invalid", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          current: {
            temperature_2m: "warm",
            relative_humidity_2m: 50,
            precipitation: 0,
          },
          current_units: {},
        }),
      }),
    );

    const snapshot = await fetchTsinghuaWeather();

    expect(snapshot.status).toBe("unavailable");
    expect(snapshot.error).toContain("invalid current weather");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- weatherService.test.ts --run
```

Expected: FAIL because the current implementation returns a live snapshot for any object-shaped `current`.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/weatherService.ts`, add a helper:

```ts
function isValidCurrentWeather(value: unknown): value is WeatherSnapshot["current"] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return false;
  const current = value as Record<string, unknown>;
  return [current.temperature_2m, current.relative_humidity_2m, current.precipitation]
    .every((item) => typeof item === "number" && Number.isFinite(item));
}
```

Use it before returning the live snapshot; throw `Open-Meteo response invalid current weather` on failure.

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- weatherService.test.ts --run
```

Expected: PASS for the weather service test.

- [ ] **Step 5: Run full verification**

Run:

```bash
npm test -- --run
npm run build
git diff --check
```

Expected: all tests pass, build succeeds, and diff check exits cleanly.

- [ ] **Step 6: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-validate-weather-current-values.md frontend/src/api/weatherService.test.ts frontend/src/api/weatherService.ts
git commit -m "fix: validate weather current values"
```

Expected: a local-only commit. Do not push or upload.
