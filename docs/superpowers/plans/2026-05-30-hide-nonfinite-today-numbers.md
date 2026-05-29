# Hide Non-Finite Today Numbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent `NaN` and `Infinity` from appearing on the Today dashboard when live summary numbers are malformed.

**Architecture:** Keep this as a display-layer guard in `TodayScreen`. Add a regression test with non-finite plan, queue, and weather values, then add small finite-number helpers for cost, duration, wait, weather, and preference formatting.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

---

### Task 1: Hide Non-Finite Today Dashboard Numbers

**Files:**
- Modify: `frontend/src/screens/TodayScreen.test.tsx`
- Modify: `frontend/src/screens/TodayScreen.tsx`

- [ ] **Step 1: Write the failing test**

Add a test in `frontend/src/screens/TodayScreen.test.tsx` that renders a connected `MobileSummary` with:

- `plan.estimated_cost_yuan: Number.NaN`
- `plan.estimated_duration_minutes: Number.POSITIVE_INFINITY`
- `queue_estimates[0].estimated_wait_minutes: Number.POSITIVE_INFINITY`
- live weather values containing `Number.POSITIVE_INFINITY` or `Number.NaN`

Assert that rendered text does not contain `NaN` or `Infinity`, and that confirmation-needed copy is visible.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- TodayScreen.test.tsx --run
```

Expected: FAIL because the Today dashboard currently renders non-finite values directly.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/screens/TodayScreen.tsx`:

- Add finite-number helpers.
- Use them for panel cost, summary cost/duration, recommended duration label, queue wait filtering, weather number formatting, and preference number formatting.

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- TodayScreen.test.tsx --run
```

Expected: PASS for all Today screen tests.

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
git add docs/superpowers/plans/2026-05-30-hide-nonfinite-today-numbers.md frontend/src/screens/TodayScreen.test.tsx frontend/src/screens/TodayScreen.tsx
git commit -m "fix: hide nonfinite today numbers"
```

Expected: a local-only commit. Do not push or upload.
