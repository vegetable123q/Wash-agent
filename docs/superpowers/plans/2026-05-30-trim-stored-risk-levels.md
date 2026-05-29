# Trim Stored Risk Levels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve legacy wardrobe risk levels when stored values contain harmless whitespace or mixed casing.

**Architecture:** Keep the fix in the wardrobe local-storage normalization path. Add a regression test through `fetchMobileSummary`, then trim risk level strings before validating them.

**Tech Stack:** TypeScript, Vitest, localStorage-backed mobile summary module.

---

### Task 1: Trim Stored Risk Levels

**Files:**
- Modify: `frontend/src/api/mobileSummary.test.ts`
- Modify: `frontend/src/api/mobileSummary.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the existing legacy wardrobe normalization tests in `frontend/src/api/mobileSummary.test.ts`:

```ts
it("trims legacy stored risk levels before validation", async () => {
  localStorage.setItem(
    wardrobeStorageKey,
    JSON.stringify([
      {
        item_id: "legacy-jeans",
        name: "legacy jeans",
        risks: { color_bleed: " High " },
      },
    ]),
  );

  const summary = await fetchMobileSummary();

  expect(summary.wardrobe.items[0].risks.color_bleed).toBe("high");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- mobileSummary.test.ts --run
```

Expected: FAIL because `" High "` currently lowercases to `" high "` and is stored as `"unknown"`.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/mobileSummary.ts`, update `normalizeStoredRiskRecord`:

```ts
const level = String(rawLevel).trim().toLowerCase();
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
git add docs/superpowers/plans/2026-05-30-trim-stored-risk-levels.md frontend/src/api/mobileSummary.test.ts frontend/src/api/mobileSummary.ts
git commit -m "fix: trim stored risk levels"
```

Expected: a local-only commit. Do not push or upload.
