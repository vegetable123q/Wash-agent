# Dedupe Selected Laundry Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent duplicate `selected_item_ids` from causing the same wardrobe item to be planned multiple times.

**Architecture:** Normalize the selected ID list inside `selectedItems` in `laundryPlanner.ts`, preserving first occurrence order before missing-ID validation and item lookup.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add Duplicate Selection Regression Coverage

**Files:**
- Modify: `frontend/src/api/laundryPlanner.test.ts`

- [ ] **Step 1: Write the failing test**

Add:

```ts
  it("deduplicates selected item ids before planning", () => {
    const item = standardItem("tee-1", "白色棉 T 恤");
    const plan = planLaundry([item], {
      selected_item_ids: ["tee-1", "tee-1"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: 10,
      budget_yuan: null,
    }, context);

    expect(plan.buckets[0].item_ids).toEqual(["tee-1"]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- laundryPlanner.test.ts --run`

Expected: FAIL because `selectedItems` currently maps duplicate IDs directly to duplicate items.

### Task 2: Dedupe Selected IDs

**Files:**
- Modify: `frontend/src/api/laundryPlanner.ts`

- [ ] **Step 1: Write minimal implementation**

In `selectedItems`, derive IDs with:

```ts
const uniqueIds = [...new Set(ids)];
```

Then validate and map `uniqueIds` instead of `ids`.

- [ ] **Step 2: Run focused test**

Run: `npm test -- laundryPlanner.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-dedupe-selected-laundry-items.md`
- Modify: `frontend/src/api/laundryPlanner.ts`
- Modify: `frontend/src/api/laundryPlanner.test.ts`

- [ ] **Step 1: Run related checks**

Run: `npm test -- laundryPlanner.test.ts mobileSummary.test.ts PlanDetailScreen.test.tsx --run`

Expected: PASS.

- [ ] **Step 2: Run full frontend checks**

Run: `npm test -- --run`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Inspect diff**

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 4: Commit locally without uploading**

```bash
git add docs/superpowers/plans/2026-05-30-dedupe-selected-laundry-items.md frontend/src/api/laundryPlanner.ts frontend/src/api/laundryPlanner.test.ts
git commit -m "fix: dedupe selected laundry items"
```
