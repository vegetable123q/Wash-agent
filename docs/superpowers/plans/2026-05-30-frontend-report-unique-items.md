# Frontend Report Unique Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frontend `generateReport()` reject duplicate wardrobe item IDs in its `items` input before the `Map` used for item names silently overwrites one item with another.

**Architecture:** Add a report input validation helper before building `itemNames`. Traverse `items`, collect repeated `profile.item_id` values, and throw a clear duplicate-ID error.

**Tech Stack:** TypeScript, Vitest, Vite build.

---

### Task 1: Reject duplicate frontend report item IDs

**Files:**
- Modify: `frontend/src/api/reportGenerator.test.ts`
- Modify: `frontend/src/api/reportGenerator.ts`

- [x] **Step 1: Write the failing test**

Add a test near the duplicate plan item ID coverage:

```ts
it("rejects duplicate report item ids before rendering", () => {
  const items = [
    ...minimalItems(),
    { ...minimalItems()[0], profile: { ...minimalItems()[0].profile, name: "duplicate bedding" } },
  ];

  expect(() => generateReport(minimalPlan(), items, minimalCampusContext())).toThrow(/duplicate.*bedding/);
});
```

- [x] **Step 2: Run test to verify it fails**

Run from `frontend`: `npm test -- src/api/reportGenerator.test.ts`

Expected: FAIL because duplicate report item IDs currently pass and later entries overwrite earlier names.

- [x] **Step 3: Write minimal implementation**

Add at the start of `generateReport()` before building `itemNames`:

```ts
validateReportItemsUnique(items);
```

Implement:

```ts
function validateReportItemsUnique(items: WardrobeItemForPlan[]): void {
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
git add docs/superpowers/plans/2026-05-30-frontend-report-unique-items.md frontend/src/api/reportGenerator.test.ts frontend/src/api/reportGenerator.ts
git commit -m "fix: validate frontend report item ids"
```

Expected: one local commit. Do not push or upload.
