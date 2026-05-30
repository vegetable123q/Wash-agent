# Frontend Zero Laundry Constraints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the frontend laundry planner honor explicit zero-valued `budget_yuan` and `max_wait_minutes` constraints, matching the backend non-negative constraint semantics.

**Architecture:** Rename the local numeric constraint helper to express non-negative semantics and accept `0`. Keep negative, non-finite, and null values ignored as invalid or unset.

**Tech Stack:** TypeScript, Vitest, Vite build.

---

### Task 1: Honor zero-valued frontend laundry constraints

**Files:**
- Modify: `frontend/src/api/laundryPlanner.test.ts`
- Modify: `frontend/src/api/laundryPlanner.ts`

- [x] **Step 1: Write the failing test**

Add a focused test in `planLaundry` coverage:

```ts
it("honors zero budget and wait constraints", () => {
  const constrainedContext: CampusContext = {
    ...context,
    queue_estimates: [
      {
        ...context.queue_estimates[0],
        estimated_wait_minutes: 1,
      },
    ],
  };

  const plan = planLaundry([standardItem("tee-1", "white tee")], {
    selected_item_ids: ["tee-1"],
    urgent_item_ids: [],
    allow_mixed_colors: false,
    allow_dryer: false,
    hygiene_sensitive: true,
    max_wait_minutes: 0,
    budget_yuan: 0,
  }, constrainedContext);

  expect(plan.global_warnings.some((warning) => warning.includes("3.5") && warning.includes("0"))).toBe(true);
  expect(plan.global_warnings.some((warning) => warning.includes("1") && warning.includes("0"))).toBe(true);
});
```

- [x] **Step 2: Run test to verify it fails**

Run from `frontend`: `npm test -- src/api/laundryPlanner.test.ts`

Expected: FAIL because zero constraints are currently ignored.

- [x] **Step 3: Write minimal implementation**

In `frontend/src/api/laundryPlanner.ts`, replace `positiveConstraintNumber` with:

```ts
function nonNegativeConstraintNumber(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}
```

Update both call sites.

- [x] **Step 4: Run target frontend test**

Run from `frontend`: `npm test -- src/api/laundryPlanner.test.ts`

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
git add docs/superpowers/plans/2026-05-30-frontend-zero-laundry-constraints.md frontend/src/api/laundryPlanner.test.ts frontend/src/api/laundryPlanner.ts
git commit -m "fix: honor zero laundry constraints"
```

Expected: one local commit. Do not push or upload.
