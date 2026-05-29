# Trim Selected Laundry IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `planLaundry` tolerate selected item IDs with accidental surrounding whitespace.

**Architecture:** Normalize `selected_item_ids` inside `selectedItems` by trimming, filtering empty values, and then deduplicating before validation. This keeps planner behavior robust even when called outside the UI selection helper.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add Whitespace Selection Regression Coverage

**Files:**
- Modify: `frontend/src/api/laundryPlanner.test.ts`

- [ ] **Step 1: Write the failing test**

Add:

```ts
  it("trims selected item ids before planning", () => {
    const item = standardItem("tee-1", "白色棉 T 恤");
    const plan = planLaundry([item], {
      selected_item_ids: [" tee-1 "],
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

Expected: FAIL because `selectedItems` currently validates raw IDs.

### Task 2: Normalize Selected IDs

**Files:**
- Modify: `frontend/src/api/laundryPlanner.ts`

- [ ] **Step 1: Write minimal implementation**

In `selectedItems`, replace:

```ts
const uniqueIds = [...new Set(ids)];
```

with:

```ts
const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
```

After deriving `uniqueIds`, throw the existing required error when it is empty.

- [ ] **Step 2: Run focused test**

Run: `npm test -- laundryPlanner.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-trim-selected-laundry-ids.md`
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
git add docs/superpowers/plans/2026-05-30-trim-selected-laundry-ids.md frontend/src/api/laundryPlanner.ts frontend/src/api/laundryPlanner.test.ts
git commit -m "fix: trim selected laundry ids"
```
