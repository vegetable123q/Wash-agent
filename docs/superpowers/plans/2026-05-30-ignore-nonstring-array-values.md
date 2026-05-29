# Ignore Nonstring Array Values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent legacy local wardrobe arrays from turning nonstring values into misleading strings such as `"true"` or `"7"`.

**Architecture:** Keep the fix in the shared `stringArray` helper used by local wardrobe normalization. Add a regression test through `fetchMobileSummary`, then only trim and keep actual string items.

**Tech Stack:** TypeScript, Vitest, localStorage-backed mobile summary module.

---

### Task 1: Ignore Nonstring Values In Stored Arrays

**Files:**
- Modify: `frontend/src/api/mobileSummary.test.ts`
- Modify: `frontend/src/api/mobileSummary.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the existing legacy wardrobe normalization tests in `frontend/src/api/mobileSummary.test.ts`:

```ts
it("ignores nonstring legacy array values", async () => {
  localStorage.setItem(
    wardrobeStorageKey,
    JSON.stringify([
      {
        item_id: "legacy-tee",
        name: "legacy tee",
        colors: [" white ", true, 7],
        user_notes: [" keep ", false],
      },
    ]),
  );

  const summary = await fetchMobileSummary();

  expect(summary.wardrobe.items[0].colors).toEqual(["white"]);
  expect(summary.wardrobe.items[0].user_notes).toEqual(["keep"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- mobileSummary.test.ts --run
```

Expected: FAIL because the current helper stringifies booleans and numbers.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/mobileSummary.ts`, update `stringArray`:

```ts
function stringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value
        .filter((item): item is string => typeof item === "string")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
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
git add docs/superpowers/plans/2026-05-30-ignore-nonstring-array-values.md frontend/src/api/mobileSummary.test.ts frontend/src/api/mobileSummary.ts
git commit -m "fix: ignore nonstring array values"
```

Expected: a local-only commit. Do not push or upload.
