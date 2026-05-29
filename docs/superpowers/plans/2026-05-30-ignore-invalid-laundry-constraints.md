# Ignore Invalid Laundry Constraints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent invalid negative laundry budget and wait constraints from creating nonsensical global warnings.

**Architecture:** Keep validation inside `planLaundry` so every caller benefits, including mobile summary rebuilds and future direct planner use. Add a focused planner regression test first, then route budget and wait comparisons through a local positive-number helper.

**Tech Stack:** TypeScript, Vitest, existing laundry planning module.

---

### Task 1: Ignore Invalid Budget And Wait Constraints

**Files:**
- Modify: `frontend/src/api/laundryPlanner.test.ts`
- Modify: `frontend/src/api/laundryPlanner.ts`

- [ ] **Step 1: Write the failing test**

Add this test under `describe("planLaundry", ...)` in `frontend/src/api/laundryPlanner.test.ts`:

```ts
it("ignores invalid budget and wait constraints", () => {
  const plan = planLaundry([standardItem("tee-1", "white tee")], {
    selected_item_ids: ["tee-1"],
    urgent_item_ids: [],
    allow_mixed_colors: false,
    allow_dryer: false,
    hygiene_sensitive: true,
    max_wait_minutes: -1,
    budget_yuan: -5,
  }, context);

  const warningText = plan.global_warnings.join("\n");
  expect(warningText).not.toContain("-1");
  expect(warningText).not.toContain("-5");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- laundryPlanner.test.ts --run
```

Expected: FAIL because the current planner uses negative budget and wait constraints in warning text.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/laundryPlanner.ts`, normalize constraints before comparisons:

```ts
const budgetYuan = positiveConstraintNumber(constraints.budget_yuan);
if (budgetYuan != null && estimatedCost > budgetYuan) {
  warnings.push(`预计费用 ${estimatedCost} 元超过预算 ${budgetYuan} 元。`);
  ...
}
```

and:

```ts
const maxWaitMinutes = positiveConstraintNumber(constraints.max_wait_minutes);
if (maxWaitMinutes == null) return [];
```

Use `maxWaitMinutes` in wait warning messages and comparisons.

Add:

```ts
function positiveConstraintNumber(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) && value > 0 ? value : null;
}
```

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- laundryPlanner.test.ts --run
```

Expected: PASS for all planner tests.

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
git add docs/superpowers/plans/2026-05-30-ignore-invalid-laundry-constraints.md frontend/src/api/laundryPlanner.test.ts frontend/src/api/laundryPlanner.ts
git commit -m "fix: ignore invalid laundry constraints"
```

Expected: a local-only commit. Do not push or upload.
