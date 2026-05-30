# Laundry Room Sanitize Weather Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent invalid live weather numbers from rendering as `NaN` or `Infinity` in the laundry room context card.

**Architecture:** Keep the fix inside `LaundryRoomScreen.tsx` by adding a finite-number formatter for weather summary parts. Existing unavailable-weather behavior remains unchanged.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

---

### Task 1: Sanitize laundry room weather summary values

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-laundry-room-sanitize-weather-summary.md`
- Modify: `frontend/src/screens/LaundryRoomScreen.test.tsx`
- Modify: `frontend/src/screens/LaundryRoomScreen.tsx`

- [x] **Step 1: Add failing laundry room weather coverage**

Add a test rendering a mobile summary with live weather containing:

```ts
temperature_2m: Number.NaN,
relative_humidity_2m: Number.POSITIVE_INFINITY,
precipitation: Number.NaN,
```

Assert the rendered text does not contain `NaN` or `Infinity`.

Run from `frontend`:

```bash
npm test -- src/screens/LaundryRoomScreen.test.tsx
```

Expected: FAIL because the screen currently checks only `!= null`.

- [x] **Step 2: Implement finite weather part filtering**

In `weatherSummary`, push a weather part only when the value is a finite number:

```ts
if (isFiniteNumber(w.current.temperature_2m)) parts.push(...);
```

Add a local `isFiniteNumber` helper near `weatherSummary`.

- [x] **Step 3: Run target and frontend verification**

Run from `frontend`:

```bash
npm test -- src/screens/LaundryRoomScreen.test.tsx
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
git add docs/superpowers/plans/2026-05-30-laundry-room-sanitize-weather-summary.md frontend/src/screens/LaundryRoomScreen.test.tsx frontend/src/screens/LaundryRoomScreen.tsx
git commit -m "fix: sanitize laundry room weather summary"
```

Expected: one local commit. Do not push or upload.
