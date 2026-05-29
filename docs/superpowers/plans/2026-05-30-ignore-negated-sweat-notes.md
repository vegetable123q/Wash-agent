# Ignore Negated Sweat Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Avoid marking items as hygiene-sensitive when the user explicitly says they did not sweat or the item is not damp.

**Architecture:** Keep the existing dirty-basket warning helper. Add a small negative-phrase guard before the hygiene-sensitive keyword checks.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/api/mobileSummary.test.ts`
  - Add coverage for a two-day dirty-basket item whose note says `没出汗`.
- Modify: `frontend/src/api/mobileSummary.ts`
  - Update `isHygieneSensitiveItem` to handle negative sweat/dampness phrases first.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the dirty-basket date/warning tests:

```ts
  it("does not mark negated sweat notes as hygiene sensitive", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "tee-1",
          name: "白色棉T恤",
          user_note: "没出汗",
          user_notes: ["没出汗"],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        },
      ]),
    );
    localStorage.setItem(
      dirtyBasketStorageKey,
      JSON.stringify([{ item_id: "tee-1", added_at: "2026-05-27T12:00:00.000Z" }]),
    );

    const summary = await fetchMobileSummary();

    expect(summary.dirty_basket.items[0].warning_label).toBe("已放 2 天");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: FAIL because current hygiene-sensitive matching sees `出汗` inside `没出汗`.

---

### Task 2: Exclude Negative Hygiene Phrases

**Files:**
- Modify: `frontend/src/api/mobileSummary.ts`
- Test: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Write minimal implementation**

Change `isHygieneSensitiveItem` to:

```ts
function isHygieneSensitiveItem(item: WardrobeSummaryItem): boolean {
  const text = itemSearchText(item);
  if (["没出汗", "未出汗", "不出汗", "不潮湿", "不湿"].some((term) => text.includes(term))) {
    return false;
  }
  return ["运动", "速干", "内衣", "贴身", "袜", "出汗", "潮湿", "湿"].some((term) => text.includes(term));
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-ignore-negated-sweat-notes.md`
- Modify: `frontend/src/api/mobileSummary.ts`
- Modify: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Run full frontend tests**

Run: `npm test -- --run`

Expected: PASS with all frontend test files green.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS with TypeScript and Vite build completing successfully.

- [ ] **Step 3: Check whitespace**

Run: `git diff --check`

Expected: exit code 0.

- [ ] **Step 4: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-ignore-negated-sweat-notes.md frontend/src/api/mobileSummary.ts frontend/src/api/mobileSummary.test.ts
git commit -m "fix: ignore negated sweat notes"
```

Expected: a local-only commit. Do not push or upload.
