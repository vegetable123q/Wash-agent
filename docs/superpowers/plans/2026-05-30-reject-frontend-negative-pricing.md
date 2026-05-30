# Reject Frontend Negative Pricing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frontend laundry planning reject negative wash/dryer prices and durations, matching backend planner validation.

**Architecture:** Keep the existing pricing helper shape and error messages. Extend `washProgramValue()` and `dryerProgramValue()` to reject values below zero after numeric conversion.

**Tech Stack:** TypeScript, Vitest, Vite, `npm`.

---

### Task 1: Reject negative frontend pricing values

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-reject-frontend-negative-pricing.md`
- Modify: `frontend/src/api/laundryPlanner.test.ts`
- Modify: `frontend/src/api/laundryPlanner.ts`

- [x] **Step 1: Add failing frontend test**

Add near existing invalid pricing tests:

```ts
it("rejects negative pricing values instead of returning negative totals", () => {
  const invalidContext: CampusContext = {
    ...context,
    pricing_rules: {
      ...context.pricing_rules,
      wash_programs: {
        ...context.pricing_rules.wash_programs,
        standard: { price_yuan: -1, duration_minutes: 40 },
      },
    },
  };

  expect(() => planLaundry([standardItem("tee-1", "white tee")], {
    selected_item_ids: ["tee-1"],
    urgent_item_ids: [],
    allow_mixed_colors: false,
    allow_dryer: false,
    hygiene_sensitive: true,
    max_wait_minutes: null,
    budget_yuan: null,
  }, invalidContext)).toThrow("invalid wash program price_yuan: standard");
});
```

Run from `frontend`: `npm test -- src/api/laundryPlanner.test.ts`

Expected: FAIL because frontend currently accepts negative finite pricing values.

- [x] **Step 2: Implement non-negative pricing validation**

In both pricing helpers:

```ts
if (!Number.isFinite(value) || value < 0) {
  throw new Error(`invalid ...`);
}
```

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
git add docs/superpowers/plans/2026-05-30-reject-frontend-negative-pricing.md frontend/src/api/laundryPlanner.test.ts frontend/src/api/laundryPlanner.ts
git commit -m "fix: reject frontend negative pricing"
```

Expected: one local commit. Do not push or upload.
