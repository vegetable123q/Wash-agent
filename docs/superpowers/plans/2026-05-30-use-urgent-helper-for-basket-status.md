# Use Urgent Helper For Basket Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep dirty-basket urgent count and urgent status label consistent for notes like `今晚急用`.

**Architecture:** Reuse the existing `isUrgentItem` helper for both `urgent_count` and the basket-level `hasUrgentItem` branch instead of duplicating a narrower `明天要穿` string check.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/api/mobileSummary.test.ts`
  - Add coverage for a selected item whose note says `今晚急用`.
- Modify: `frontend/src/api/mobileSummary.ts`
  - Replace the custom `hasUrgentItem` expression with `selectedItems.some(isUrgentItem)`.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the dirty-basket urgency tests:

```ts
  it("uses urgent notes for the dirty-basket status label", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "tee-1",
          name: "白色棉T恤",
          user_note: "今晚急用",
          user_notes: ["今晚急用"],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        },
      ]),
    );

    await setLaundrySelection(["tee-1"]);
    const summary = await fetchMobileSummary();

    expect(summary.dirty_basket.urgent_count).toBe(1);
    expect(summary.dirty_basket.status_label).toBe("有急用衣物");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: FAIL because current basket status only checks `明天要穿`.

---

### Task 2: Reuse Urgency Helper

**Files:**
- Modify: `frontend/src/api/mobileSummary.ts`
- Test: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Write minimal implementation**

Change:

```ts
const hasUrgentItem = selectedItems.some((item) =>
  [item.name, item.user_note, ...(item.user_notes ?? [])].join(" ").includes("明天要穿"),
);
```

to:

```ts
const hasUrgentItem = selectedItems.some(isUrgentItem);
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-use-urgent-helper-for-basket-status.md`
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
git add docs/superpowers/plans/2026-05-30-use-urgent-helper-for-basket-status.md frontend/src/api/mobileSummary.ts frontend/src/api/mobileSummary.test.ts
git commit -m "fix: use urgent helper for basket status"
```

Expected: a local-only commit. Do not push or upload.
