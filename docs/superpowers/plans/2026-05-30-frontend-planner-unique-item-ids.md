# Frontend Planner Unique Item IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frontend `planLaundry()` reject duplicate wardrobe item IDs before selected-item lookup silently overwrites one item with another.

**Architecture:** Add a small uniqueness validation at the start of `planLaundry()`. Track `item.profile.item_id`, collect duplicates, and throw a clear error before calling `selectedItems()`.

**Tech Stack:** TypeScript, Vitest, Vite build.

---

### Task 1: Reject duplicate frontend planner item IDs

**Files:**
- Modify: `frontend/src/api/laundryPlanner.test.ts`
- Modify: `frontend/src/api/laundryPlanner.ts`

- [x] **Step 1: Write the failing test**

Add a test near selected item ID coverage:

```ts
it("rejects duplicate item ids before planning", () => {
  const duplicate = standardItem("tee-1", "duplicate tee");

  expect(() => planLaundry([standardItem("tee-1", "white tee"), duplicate], {
    selected_item_ids: ["tee-1"],
    urgent_item_ids: [],
    allow_mixed_colors: false,
    allow_dryer: false,
    hygiene_sensitive: true,
    max_wait_minutes: null,
    budget_yuan: null,
  }, context)).toThrow(/duplicate.*tee-1/);
});
```

- [x] **Step 2: Run test to verify it fails**

Run from `frontend`: `npm test -- src/api/laundryPlanner.test.ts`

Expected: FAIL because duplicate input items currently pass and the latter item wins.

- [x] **Step 3: Write minimal implementation**

At the top of `planLaundry()`:

```ts
validateUniqueItemIds(items);
```

Implement:

```ts
function validateUniqueItemIds(items: WardrobeItemForPlan[]): void {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const item of items) {
    const itemId = item.profile.item_id;
    if (seen.has(itemId)) {
      duplicates.push(itemId);
      continue;
    }
    seen.add(itemId);
  }
  if (duplicates.length) {
    throw new Error(`items duplicate item_id: ${dedupe(duplicates).join(", ")}`);
  }
}
```

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
git add docs/superpowers/plans/2026-05-30-frontend-planner-unique-item-ids.md frontend/src/api/laundryPlanner.test.ts frontend/src/api/laundryPlanner.ts
git commit -m "fix: validate frontend planner item ids"
```

Expected: one local commit. Do not push or upload.
