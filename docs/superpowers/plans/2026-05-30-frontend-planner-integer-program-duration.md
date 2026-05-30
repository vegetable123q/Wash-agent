# Frontend Planner Integer Program Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the frontend planner reject fractional program durations instead of silently rounding them into plan estimates.

**Architecture:** Tighten `washProgramValue` and `dryerProgramValue`; `duration_minutes` must be a finite positive integer, while `price_yuan` remains a finite non-negative number.

**Tech Stack:** TypeScript, Vitest, Vite, `npm`.

---

### Task 1: Validate planner program durations

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-frontend-planner-integer-program-duration.md`
- Modify: `frontend/src/api/laundryPlanner.test.ts`
- Modify: `frontend/src/api/laundryPlanner.ts`

- [x] **Step 1: Add failing fractional duration coverage**

Add a planner test with:

```ts
standard: { price_yuan: 3.5, duration_minutes: 1.5 },
```

and assert planning throws `invalid wash program duration_minutes: standard`.

Run from `frontend`:

```bash
npm test -- src/api/laundryPlanner.test.ts
```

Expected: FAIL because the planner currently accepts fractional durations and rounds them.

- [x] **Step 2: Implement positive integer duration validation**

For `duration_minutes`, require `Number.isInteger(value) && value > 0`.

- [x] **Step 3: Run target and full frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/laundryPlanner.test.ts
npm test
npm run build
```

Run from repo root:

```bash
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 4: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-frontend-planner-integer-program-duration.md frontend/src/api/laundryPlanner.test.ts frontend/src/api/laundryPlanner.ts
git commit -m "fix: validate frontend planner program durations"
```

Expected: one local commit. Do not push or upload.
