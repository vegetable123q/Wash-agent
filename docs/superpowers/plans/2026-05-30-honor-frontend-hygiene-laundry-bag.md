# Honor Frontend Hygiene Laundry Bag Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frontend laundry planning use a laundry bag for machine-wash buckets when `hygiene_sensitive` is true, matching backend planner behavior.

**Architecture:** Keep bucket assignment unchanged. Extend the existing `use_laundry_bag` condition in `buildBucket()` to include `constraints.hygiene_sensitive`.

**Tech Stack:** TypeScript, Vitest, Vite, `npm`.

---

### Task 1: Honor hygiene-sensitive laundry bag preference in frontend planner

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-honor-frontend-hygiene-laundry-bag.md`
- Modify: `frontend/src/api/laundryPlanner.test.ts`
- Modify: `frontend/src/api/laundryPlanner.ts`

- [x] **Step 1: Add failing frontend test**

Add near existing planner constraint tests:

```ts
it("uses a laundry bag for standard buckets when hygiene sensitive", () => {
  const plan = planLaundry([standardItem("tee-1", "white tee")], {
    selected_item_ids: ["tee-1"],
    urgent_item_ids: [],
    allow_mixed_colors: false,
    allow_dryer: false,
    hygiene_sensitive: true,
    max_wait_minutes: 10,
    budget_yuan: null,
  }, context);

  expect(plan.buckets[0].use_laundry_bag).toBe(true);
});
```

Run from `frontend`: `npm test -- src/api/laundryPlanner.test.ts`

Expected: FAIL because frontend currently ignores `hygiene_sensitive` for laundry bag selection.

- [x] **Step 2: Implement minimal planner change**

In `buildBucket()`:

```ts
use_laundry_bag: baseBucketId === "dark-standard" || constraints.hygiene_sensitive || anyRecommendsBag(items),
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
git add docs/superpowers/plans/2026-05-30-honor-frontend-hygiene-laundry-bag.md frontend/src/api/laundryPlanner.test.ts frontend/src/api/laundryPlanner.ts
git commit -m "fix: honor frontend hygiene laundry bag"
```

Expected: one local commit. Do not push or upload.
