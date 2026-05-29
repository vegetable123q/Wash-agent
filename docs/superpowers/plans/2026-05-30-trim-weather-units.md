# Trim Weather Units Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Trim weather unit strings and ignore blank units before they reach the Today screen.

**Architecture:** Keep the normalization in `unitStrings`, the existing Open-Meteo unit adapter. Add a regression test for padded and blank unit values, then convert the object entries through a trim-and-filter pass.

**Tech Stack:** TypeScript, Vitest, Open-Meteo weather adapter.

---

### Task 1: Trim and Filter Weather Units

**Files:**
- Modify: `frontend/src/api/weatherService.test.ts`
- Modify: `frontend/src/api/weatherService.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `frontend/src/api/weatherService.test.ts`:

```ts
it("trims weather unit strings and ignores blank units", async () => {
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
          temperature_2m: " °C ",
          relative_humidity_2m: "   ",
          precipitation: " mm ",
        },
      }),
    }),
  );

  const snapshot = await fetchTsinghuaWeather();

  expect(snapshot.status).toBe("live");
  expect(snapshot.units).toEqual({ temperature_2m: "°C", precipitation: "mm" });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- weatherService.test.ts --run
```

Expected: FAIL because unit strings are currently returned without trimming and blank strings are preserved.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/weatherService.ts`, update `unitStrings` to trim string values and return only nonempty units.

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
git add docs/superpowers/plans/2026-05-30-trim-weather-units.md frontend/src/api/weatherService.test.ts frontend/src/api/weatherService.ts
git commit -m "fix: trim weather units"
```

Expected: a local-only commit. Do not push or upload.
