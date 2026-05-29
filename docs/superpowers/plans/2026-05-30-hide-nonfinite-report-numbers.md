# Hide Non-Finite Report Numbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent `NaN` and `Infinity` from appearing in the visual report when live summary numbers are malformed.

**Architecture:** Keep this as a display-layer guard in `ReportScreen`. Add a regression test with non-finite plan, price-rule, and queue values, then use one finite nonnegative number helper for price, duration, route pricing, and wait-time rendering.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

---

### Task 1: Hide Non-Finite Report Numbers

**Files:**
- Modify: `frontend/src/screens/ReportScreen.test.tsx`
- Modify: `frontend/src/screens/ReportScreen.tsx`

- [ ] **Step 1: Write the failing test**

Add a test in `frontend/src/screens/ReportScreen.test.tsx` that renders a live `MobileSummary` with:

- `plan.estimated_cost_yuan: Number.NaN`
- `plan.estimated_duration_minutes: Number.POSITIVE_INFINITY`
- a route price rule with `price_yuan: Number.POSITIVE_INFINITY`
- a queue estimate with `estimated_wait_minutes: Number.POSITIVE_INFINITY`

Assert that the rendered text does not contain `NaN` or `Infinity`, and that it still shows confirmation-needed copy.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- ReportScreen.test.tsx --run
```

Expected: FAIL because the report currently renders non-finite values directly.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/screens/ReportScreen.tsx`:

- Add `isFiniteNonNegativeNumber(value: unknown): value is number`.
- Make `formatPrice` return `"待确认"` unless the value is finite and nonnegative.
- Add `formatDuration` for plan duration.
- Use the same helper when summing route prices and filtering queue wait times.

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- ReportScreen.test.tsx --run
```

Expected: PASS for all report screen tests.

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
git add docs/superpowers/plans/2026-05-30-hide-nonfinite-report-numbers.md frontend/src/screens/ReportScreen.test.tsx frontend/src/screens/ReportScreen.tsx
git commit -m "fix: hide nonfinite report numbers"
```

Expected: a local-only commit. Do not push or upload.
