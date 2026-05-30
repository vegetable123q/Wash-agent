# Add Frontend Mixed Standard Planning Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frontend laundry planning honor `allow_mixed_colors` by combining low-risk standard items into `mixed-standard`, matching backend planner behavior.

**Architecture:** Pass constraints into frontend bucket splitting, add `mixed-standard` to bucket ordering, mirror backend bucket selection for low-risk dark/light items, and treat `mixed-standard` as a standard detergent bucket.

**Tech Stack:** TypeScript, Vitest, Vite, `npm`.

---

### Task 1: Add frontend mixed-standard bucket support

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-add-frontend-mixed-standard-planning.md`
- Modify: `frontend/src/api/laundryPlanner.test.ts`
- Modify: `frontend/src/api/laundryPlanner.ts`

- [x] **Step 1: Add failing frontend test**

Add a test near the existing planner tests:

```ts
it("combines low-risk light and dark items when mixed colors are allowed", () => {
  const items = [
    standardItem("white-tee", "white cotton tee", ["white"]),
    standardItem("navy-tee", "navy cotton tee", ["navy"]),
  ];

  const plan = planLaundry(items, {
    selected_item_ids: ["white-tee", "navy-tee"],
    urgent_item_ids: [],
    allow_mixed_colors: true,
    allow_dryer: false,
    hygiene_sensitive: false,
    max_wait_minutes: 10,
    budget_yuan: null,
  }, context);

  expect(plan.buckets).toHaveLength(1);
  expect(plan.buckets[0]).toMatchObject({
    bucket_id: "mixed-standard",
    item_ids: ["white-tee", "navy-tee"],
    detergent_ml: 30,
    program: "standard",
  });
});
```

Update `standardItem()` to accept optional colors:

```ts
function standardItem(itemId: string, name: string, colors: string[] = ["white"]): WardrobeItemForPlan
```

Run from `frontend`: `npm test -- src/api/laundryPlanner.test.ts`

Expected: FAIL because frontend currently ignores `allow_mixed_colors` during bucket selection.

- [x] **Step 2: Implement mixed bucket selection**

In `frontend/src/api/laundryPlanner.ts`:

- Add `"mixed-standard"` to `BUCKET_ORDER`.
- Pass constraints into `splitBucketInputs(selected, constraints)`.
- Change `splitBucketInputs()` and `bucketIdFor()` signatures to receive constraints.
- Mirror backend logic:

```ts
if (containsAny(text, DARK_COLOR_TERMS) || hasHighRisk(item, new Set(["color_bleed"]))) {
  if (constraints.allow_mixed_colors && !hasHighRisk(item, new Set(["color_bleed"]))) return "mixed-standard";
  return "dark-standard";
}
if (containsAny(text, LIGHT_COLOR_TERMS)) return constraints.allow_mixed_colors ? "mixed-standard" : "light-standard";
```

- Treat `"mixed-standard"` as a standard detergent bucket.
- Add the backend-equivalent mixed warning in `machineBucketWarnings()`.

- [x] **Step 3: Run target frontend test**

Run from `frontend`: `npm test -- src/api/laundryPlanner.test.ts`

Expected: PASS.

- [x] **Step 4: Run broader frontend verification**

Run from `frontend`:

```bash
npm test
npm run build
```

Run from repo root:

```bash
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 5: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-add-frontend-mixed-standard-planning.md frontend/src/api/laundryPlanner.test.ts frontend/src/api/laundryPlanner.ts
git commit -m "feat: add frontend mixed standard planning"
```

Expected: one local commit. Do not push or upload.
