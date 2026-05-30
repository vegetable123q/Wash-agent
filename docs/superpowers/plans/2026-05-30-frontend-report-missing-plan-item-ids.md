# Frontend Report Missing Plan Item IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frontend `generateReport()` reject all missing plan item IDs before rendering, and include every missing ID in the error message.

**Architecture:** Add a validation pass that builds a set of item IDs from `items`, traverses `plan.buckets[*].item_ids`, dedupes missing IDs, and throws before section rendering.

**Tech Stack:** TypeScript, Vitest, Vite build.

---

### Task 1: Report all missing frontend plan item IDs

**Files:**
- Modify: `frontend/src/api/reportGenerator.test.ts`
- Modify: `frontend/src/api/reportGenerator.ts`

- [x] **Step 1: Write the failing test**

Add a test near the report input validation coverage:

```ts
it("lists all missing plan item ids before rendering", () => {
  const plan = minimalPlan();
  plan.buckets = [
    { ...plan.buckets[0], item_ids: ["missing-a", "missing-b"] },
  ];

  expect(() => generateReport(plan, minimalItems(), minimalCampusContext())).toThrow(/missing-a.*missing-b/);
});
```

- [x] **Step 2: Run test to verify it fails**

Run from `frontend`: `npm test -- src/api/reportGenerator.test.ts`

Expected: FAIL because the current renderer throws only the first missing item ID.

- [x] **Step 3: Write minimal implementation**

Add near the start of `generateReport()` after item uniqueness validation:

```ts
validatePlanItemIdsPresent(plan, items);
```

Implement:

```ts
function validatePlanItemIdsPresent(plan: LaundryPlan, items: WardrobeItemForPlan[]): void {
  const itemIds = new Set(items.map((item) => item.profile.item_id));
  const missing = plan.buckets.flatMap((bucket) => bucket.item_ids).filter((itemId) => !itemIds.has(itemId));
  if (missing.length) {
    throw new Error(`items missing plan item ids: ${dedupe(missing).join(", ")}`);
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
git add docs/superpowers/plans/2026-05-30-frontend-report-missing-plan-item-ids.md frontend/src/api/reportGenerator.test.ts frontend/src/api/reportGenerator.ts
git commit -m "fix: validate frontend report missing item ids"
```

Expected: one local commit. Do not push or upload.
