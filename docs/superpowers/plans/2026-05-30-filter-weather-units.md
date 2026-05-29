# Filter Weather Units Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent nonstring Open-Meteo unit values from being exposed to UI formatting.

**Architecture:** Keep units normalization local to the weather adapter. Add a regression test with mixed unit values, then filter `current_units` down to string values before returning the live snapshot.

**Tech Stack:** TypeScript, Vitest, fetch-stubbed weather adapter.

---

### Task 1: Filter Nonstring Weather Units

**Files:**
- Modify: `frontend/src/api/weatherService.test.ts`
- Modify: `frontend/src/api/weatherService.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `frontend/src/api/weatherService.test.ts`:

```ts
it("filters nonstring weather unit values", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        current: {
          temperature_2m: 20,
          relative_humidity_2m: 50,
          precipitation: 0,
        },
        current_units: {
          temperature_2m: 123,
          precipitation: "mm",
        },
      }),
    }),
  );

  const snapshot = await fetchTsinghuaWeather();

  expect(snapshot.status).toBe("live");
  expect(snapshot.units).toEqual({ precipitation: "mm" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- weatherService.test.ts --run
```

Expected: FAIL because the current implementation casts nonstring unit values through unchanged.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/weatherService.ts`, add:

```ts
function unitStrings(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter((entry): entry is [string, string] => typeof entry[1] === "string"),
  );
}
```

Use `unitStrings(units)` in the returned live snapshot.

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- weatherService.test.ts --run
```

Expected: PASS for all weather service tests.

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
git add docs/superpowers/plans/2026-05-30-filter-weather-units.md frontend/src/api/weatherService.test.ts frontend/src/api/weatherService.ts
git commit -m "fix: filter weather units"
```

Expected: a local-only commit. Do not push or upload.
