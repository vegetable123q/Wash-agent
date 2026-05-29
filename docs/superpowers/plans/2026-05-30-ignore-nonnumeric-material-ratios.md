# Ignore Nonnumeric Material Ratios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent legacy local wardrobe records from treating nonnumeric material ratio values such as `true` as 100% material content.

**Architecture:** Keep the fix in the local storage normalization path for wardrobe items. Add a regression test around `fetchMobileSummary`, then tighten the ratio parser to accept only numeric values and numeric strings.

**Tech Stack:** TypeScript, Vitest, localStorage-backed mobile summary module.

---

### Task 1: Ignore Nonnumeric Stored Material Ratios

**Files:**
- Modify: `frontend/src/api/mobileSummary.test.ts`
- Modify: `frontend/src/api/mobileSummary.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the existing legacy wardrobe normalization tests in `frontend/src/api/mobileSummary.test.ts`:

```ts
it("ignores nonnumeric legacy material ratio values", async () => {
  localStorage.setItem(
    wardrobeStorageKey,
    JSON.stringify([
      {
        item_id: "legacy-tee",
        name: "legacy tee",
        material_ratios: { cotton: true, wool: "50%" },
      },
    ]),
  );

  const summary = await fetchMobileSummary();

  expect(summary.wardrobe.items[0].material_ratios).toEqual({ wool: 0.5 });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- mobileSummary.test.ts --run
```

Expected: FAIL because `Number(true)` is currently accepted as `1`, producing `cotton: 1`.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/mobileSummary.ts`, update `storageRatioNumber` so non-string, non-number values return `Number.NaN`:

```ts
function storageRatioNumber(value: unknown): number {
  if (typeof value === "number") {
    return value;
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    return Number(trimmed.endsWith("%") ? trimmed.slice(0, -1) : trimmed);
  }
  return Number.NaN;
}
```

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- mobileSummary.test.ts --run
```

Expected: PASS for all mobile summary tests.

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
git add docs/superpowers/plans/2026-05-30-ignore-nonnumeric-material-ratios.md frontend/src/api/mobileSummary.test.ts frontend/src/api/mobileSummary.ts
git commit -m "fix: ignore nonnumeric material ratios"
```

Expected: a local-only commit. Do not push or upload.
