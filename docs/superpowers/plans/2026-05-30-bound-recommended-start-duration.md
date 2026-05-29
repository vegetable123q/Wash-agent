# Bound Recommended Start Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent invalid plan durations from producing recommended start times that can be later than the user's pickup deadline.

**Architecture:** Keep the behavior local to the `computeRecommendedStartTime` helper. Add a focused regression test first, then normalize the duration input before the pickup deadline calculation.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Reject Invalid Plan Durations In Start-Time Calculation

**Files:**
- Modify: `frontend/src/api/llmSummary.test.ts`
- Modify: `frontend/src/api/llmSummary.ts`

- [ ] **Step 1: Write the failing test**

Add this test under `describe("computeRecommendedStartTime", ...)` in `frontend/src/api/llmSummary.test.ts`:

```ts
it("defaults invalid plan durations before applying the pickup deadline", () => {
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-05-29T19:00:00.000+08:00"));

  expect(computeRecommendedStartTime(-30, "22:30")).toBe("21:15");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- llmSummary.test.ts --run
```

Expected: FAIL because the current implementation treats `-30` as a real duration and returns a start time after the pickup deadline.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/llmSummary.ts`, replace the direct nullish duration default:

```ts
const duration = planDurationMinutes ?? 60;
```

with a finite positive guard:

```ts
const duration = isValidDuration(planDurationMinutes) ? planDurationMinutes : 60;
```

Add a local helper near `isValidTimePart`:

```ts
function isValidDuration(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
```

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- llmSummary.test.ts --run
```

Expected: PASS for all `llmSummary` tests.

- [ ] **Step 5: Run full verification**

Run:

```bash
npm test -- --run
npm run build
git diff --check
```

Expected: all tests pass, production build succeeds, and whitespace check exits cleanly.

- [ ] **Step 6: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-bound-recommended-start-duration.md frontend/src/api/llmSummary.test.ts frontend/src/api/llmSummary.ts
git commit -m "fix: bound recommended start duration"
```

Expected: a local-only commit. Do not push or upload.
