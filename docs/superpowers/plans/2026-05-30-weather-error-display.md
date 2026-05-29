# Weather Error Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the provided weather error reason on the Today screen when weather data is unavailable.

**Architecture:** Keep weather fetching unchanged. `TodayScreen` already receives the normalized `WeatherSnapshot`; render its `error` field in the unavailable weather card when present.

**Tech Stack:** React, TypeScript, Testing Library, Vitest.

---

## File Structure

- Modify: `frontend/src/screens/TodayWeather.test.tsx`
  - Add a focused unavailable-weather test.
- Modify: `frontend/src/screens/TodayScreen.tsx`
  - Display `mobileSummary.weather.error` in the weather fallback card.

---

### Task 1: Unavailable Weather Error Test

**Files:**
- Modify: `frontend/src/screens/TodayWeather.test.tsx`

- [ ] **Step 1: Write the failing test**

Build a live summary fixture, replace `weather` with:

```ts
{
  source: "open-meteo",
  status: "unavailable",
  location: "Tsinghua University",
  error: "Open-Meteo returned 503",
}
```

Render `TodayScreen` connected and assert `"Open-Meteo returned 503"` is visible.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- TodayWeather.test.tsx --run`

Expected: FAIL because the screen currently shows only the generic weather unavailable copy.

---

### Task 2: Weather Error Rendering

**Files:**
- Modify: `frontend/src/screens/TodayScreen.tsx`

- [ ] **Step 1: Add a weather error value**

Derive `weatherError` from `mobileSummary.weather.error` when connected.

- [ ] **Step 2: Render error in fallback card**

In the unavailable weather card, render `weatherError ?? "请稍后刷新"`.

- [ ] **Step 3: Run focused tests**

Run: `npm test -- TodayWeather.test.tsx --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run related screen tests**

Run: `npm test -- TodayWeather.test.tsx TodayScreen.test.tsx --run`

Expected: PASS.

- [ ] **Step 2: Run full frontend tests**

Run: `npm test -- --run`

Expected: PASS.

- [ ] **Step 3: Run frontend build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Create a local-only commit**

Run:

```powershell
git add docs/superpowers/plans/2026-05-30-weather-error-display.md frontend/src/screens/TodayScreen.tsx frontend/src/screens/TodayWeather.test.tsx
git commit -m "fix: show weather error details"
```

Expected: local commit succeeds. Do not run `git push`.
