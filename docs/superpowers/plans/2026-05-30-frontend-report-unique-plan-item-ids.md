# Frontend Report Unique Plan Item IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frontend `generateReport()` reject a malformed plan that repeats the same item ID across report buckets, matching the backend report boundary.

**Architecture:** Add a small validation helper at the top of `generateReport()`. It should traverse `plan.buckets[*].item_ids`, collect repeated IDs, and throw before rendering any report sections.

**Tech Stack:** TypeScript, Vitest, Vite build.

---

### Task 1: Reject duplicate plan item IDs in frontend reports

**Files:**
- Modify: `frontend/src/api/reportGenerator.test.ts`
- Modify: `frontend/src/api/reportGenerator.ts`

- [x] **Step 1: Write the failing test**

Add a test in `reportGenerator.test.ts`:

```ts
it("rejects duplicate plan item ids before rendering", () => {
  const plan = basePlan();
  plan.buckets = [
    { ...plan.buckets[0], bucket_id: "first", item_ids: ["bedding"] },
    { ...plan.buckets[0], bucket_id: "second", item_ids: ["bedding"] },
  ];

  expect(() => generateReport(plan, baseItems(), baseCampusContext())).toThrow(/duplicate.*bedding/);
});
```

If the current test file does not yet have reusable builders, add small local fixture helpers for the new case without rewriting unrelated coverage.

- [x] **Step 2: Run test to verify it fails**

Run from `frontend`: `npm test -- src/api/reportGenerator.test.ts`

Expected: FAIL because duplicate plan item IDs currently render twice.

- [x] **Step 3: Write minimal implementation**

Add at the start of `generateReport()`:

```ts
validatePlanItemIdsUnique(plan);
```

Implement:

```ts
function validatePlanItemIdsUnique(plan: LaundryPlan): void {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const bucket of plan.buckets) {
    for (const itemId of bucket.item_ids) {
      if (seen.has(itemId)) {
        duplicates.push(itemId);
        continue;
      }
      seen.add(itemId);
    }
  }
  if (duplicates.length) {
    throw new Error(`plan duplicate item ids: ${dedupe(duplicates).join(", ")}`);
  }
}
```

- [x] **Step 4: Run target frontend test**

Run from `frontend`: `npm test -- src/api/reportGenerator.test.ts`

Expected: PASS.

- [x] **Step 5: Run full frontend tests and build**

Run from `frontend`: `npm test`

Expected: PASS.

Run from `frontend`: `npm run build`

Expected: PASS.

- [x] **Step 6: Run diff whitespace check**

Run from repo root: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-frontend-report-unique-plan-item-ids.md frontend/src/api/reportGenerator.test.ts frontend/src/api/reportGenerator.ts
git commit -m "fix: validate frontend report plan item ids"
```

Expected: one local commit. Do not push or upload.
