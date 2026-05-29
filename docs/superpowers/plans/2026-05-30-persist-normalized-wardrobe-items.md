# Persist Normalized Wardrobe Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Write normalized legacy wardrobe records back to localStorage after a successful repair.

**Architecture:** Reuse the `normalizeStoredWardrobeItem` boundary added in the previous iteration and add a small change detector in `readLocalWardrobeItems`. When parsed storage differs from the normalized shape, persist the repaired wardrobe array alongside duplicate-ID repairs.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add Persistence Regression Coverage

**Files:**
- Modify: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Write the failing test**

Extend the existing legacy wardrobe test with a storage assertion:

```ts
    const storedItems = JSON.parse(localStorage.getItem(wardrobeStorageKey) ?? "[]");
    expect(storedItems[0]).toMatchObject({
      user_note: "",
      user_notes: [],
      wash_count: 0,
      material_ratios: {},
      colors: [],
      risks: {},
    });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: FAIL because `readLocalWardrobeItems` currently writes only when duplicate item IDs were repaired.

### Task 2: Persist Normalization Repairs

**Files:**
- Modify: `frontend/src/api/mobileSummary.ts`

- [ ] **Step 1: Write minimal implementation**

In `readLocalWardrobeItems`, compute whether normalization changed storage:

```ts
const normalizationChanged = JSON.stringify(parsed) !== JSON.stringify(normalized);
```

Then write repaired items when either normalization or duplicate-ID repair changed:

```ts
if (normalizationChanged || repaired.changed) {
  writeLocalWardrobeItems(repaired.items);
}
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-persist-normalized-wardrobe-items.md`
- Modify: `frontend/src/api/mobileSummary.ts`
- Modify: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Run related checks**

Run: `npm test -- mobileSummary.test.ts WardrobeScreen.test.tsx DirtyBasketScreen.test.tsx --run`

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
git add docs/superpowers/plans/2026-05-30-persist-normalized-wardrobe-items.md frontend/src/api/mobileSummary.ts frontend/src/api/mobileSummary.test.ts
git commit -m "fix: persist normalized wardrobe records"
```
