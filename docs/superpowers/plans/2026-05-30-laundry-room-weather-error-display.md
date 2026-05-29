# Laundry Room Weather Error Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show the provided weather error reason in the Laundry Room screen context card when weather data is unavailable.

**Architecture:** Keep the change inside the existing `weatherSummary` helper. It already centralizes the Laundry Room weather copy, so it should return the snapshot error when available.

**Tech Stack:** React, TypeScript, Testing Library, Vitest.

---

## File Structure

- Modify: `frontend/src/screens/LaundryRoomScreen.test.tsx`
  - Add a focused unavailable-weather test.
- Modify: `frontend/src/screens/LaundryRoomScreen.tsx`
  - Return `mobileSummary.weather.error` before falling back to generic unavailable text.

---

### Task 1: Laundry Room Weather Error Test

**Files:**
- Modify: `frontend/src/screens/LaundryRoomScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Render `LaundryRoomScreen` with a summary whose top-level `weather` is:

```ts
{
  source: "open-meteo",
  status: "unavailable",
  location: "Tsinghua University",
  error: "Open-Meteo returned 503",
}
```

Assert `"Open-Meteo returned 503"` is visible.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- LaundryRoomScreen.test.tsx --run`

Expected: FAIL because the helper currently returns only generic unavailable copy.

---

### Task 2: Laundry Room Weather Error Rendering

**Files:**
- Modify: `frontend/src/screens/LaundryRoomScreen.tsx`

- [ ] **Step 1: Use snapshot error in weatherSummary**

If `mobileSummary.weather` is unavailable and has `error`, return that error.

- [ ] **Step 2: Run focused tests**

Run: `npm test -- LaundryRoomScreen.test.tsx --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run related screen tests**

Run: `npm test -- LaundryRoomScreen.test.tsx TodayWeather.test.tsx --run`

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
git add docs/superpowers/plans/2026-05-30-laundry-room-weather-error-display.md frontend/src/screens/LaundryRoomScreen.tsx frontend/src/screens/LaundryRoomScreen.test.tsx
git commit -m "fix: show laundry room weather errors"
```

Expected: local commit succeeds. Do not run `git push`.
