# Validate Frontend Report Totals Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frontend report generation reject invalid plan total cost/duration values before rendering a user-facing report, matching backend report validation.

**Architecture:** Keep existing null-specific messages. Add finite/non-negative validation in `costTimeSection()` for `estimated_cost_yuan`, and non-negative integer validation for `estimated_duration_minutes`.

**Tech Stack:** TypeScript, Vitest, Vite, `npm`.

---

### Task 1: Validate frontend report totals

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-validate-frontend-report-totals.md`
- Modify: `frontend/src/api/reportGenerator.test.ts`
- Modify: `frontend/src/api/reportGenerator.ts`

- [x] **Step 1: Add failing frontend test**

Add near existing report validation tests:

```ts
it("rejects invalid report totals before rendering", () => {
  expect(() => generateReport(
    { ...minimalPlan(), estimated_cost_yuan: -1 },
    minimalItems(),
    minimalCampusContext(),
  )).toThrow(/estimated_cost_yuan/);

  expect(() => generateReport(
    { ...minimalPlan(), estimated_duration_minutes: 1.5 },
    minimalItems(),
    minimalCampusContext(),
  )).toThrow(/estimated_duration_minutes/);
});
```

Run from `frontend`: `npm test -- src/api/reportGenerator.test.ts`

Expected: FAIL because frontend currently accepts negative cost and fractional duration totals.

- [x] **Step 2: Implement total validation**

In `costTimeSection()`:

```ts
const estimatedCost = requiredNonNegativeNumber(plan.estimated_cost_yuan, "plan.estimated_cost_yuan");
const estimatedDuration = requiredNonNegativeInteger(plan.estimated_duration_minutes, "plan.estimated_duration_minutes");
```

Add helpers:

```ts
function requiredNonNegativeNumber(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value < 0) throw new Error(`${fieldName} must be a non-negative finite number`);
  return value;
}

function requiredNonNegativeInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 0) throw new Error(`${fieldName} must be a non-negative integer`);
  return value;
}
```

- [x] **Step 3: Run target and full frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/reportGenerator.test.ts
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
git add docs/superpowers/plans/2026-05-30-validate-frontend-report-totals.md frontend/src/api/reportGenerator.test.ts frontend/src/api/reportGenerator.ts
git commit -m "fix: validate frontend report totals"
```

Expected: one local commit. Do not push or upload.
