# Validate Frontend Report Bucket Numbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frontend report generation reject invalid bucket-level numeric values before rendering, starting with `detergent_ml`.

**Architecture:** Add a small plan-bucket validation pass before report rendering. Reuse the existing non-negative number helper introduced for plan totals.

**Tech Stack:** TypeScript, Vitest, Vite, `npm`.

---

### Task 1: Validate frontend report bucket numbers

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-validate-frontend-report-bucket-numbers.md`
- Modify: `frontend/src/api/reportGenerator.test.ts`
- Modify: `frontend/src/api/reportGenerator.ts`

- [x] **Step 1: Add failing frontend test**

Add near existing report validation tests:

```ts
it("rejects invalid bucket detergent before rendering", () => {
  const plan = minimalPlan();
  plan.buckets = [{ ...plan.buckets[0], detergent_ml: -1 }];

  expect(() => generateReport(plan, minimalItems(), minimalCampusContext())).toThrow(/detergent_ml/);
});
```

Run from `frontend`: `npm test -- src/api/reportGenerator.test.ts`

Expected: FAIL because frontend currently renders negative detergent values.

- [x] **Step 2: Implement bucket numeric validation**

Call a new validator in `generateReport()`:

```ts
validateBucketNumbers(plan);
```

Add:

```ts
function validateBucketNumbers(plan: LaundryPlan): void {
  plan.buckets.forEach((bucket, index) => {
    if (bucket.detergent_ml != null) {
      requiredNonNegativeNumber(bucket.detergent_ml, `plan.buckets[${index}].detergent_ml`);
    }
  });
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
git add docs/superpowers/plans/2026-05-30-validate-frontend-report-bucket-numbers.md frontend/src/api/reportGenerator.test.ts frontend/src/api/reportGenerator.ts
git commit -m "fix: validate frontend report bucket numbers"
```

Expected: one local commit. Do not push or upload.
