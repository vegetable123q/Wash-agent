# Ignore Not Urgent Notes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Avoid marking dirty-basket items as urgent when the user explicitly says they are not urgent.

**Architecture:** Keep the existing dirty-basket summary and urgency helper. Add a small negative-phrase guard before the positive urgency checks.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/api/mobileSummary.test.ts`
  - Add coverage for a selected item whose note says `不急`.
- Modify: `frontend/src/api/mobileSummary.ts`
  - Update `isUrgentItem` to handle negative urgency phrases before positive terms.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the dirty-basket summary tests:

```ts
  it("does not mark explicitly not urgent notes as urgent", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "tee-1",
          name: "白色棉T恤",
          user_note: "不急，周末再洗",
          user_notes: ["不急，周末再洗"],
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

    expect(summary.dirty_basket.urgent_count).toBe(0);
    expect(summary.dirty_basket.status_label).not.toBe("有急用衣物");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: FAIL because the current helper treats any `急` as urgent.

---

### Task 2: Exclude Negative Urgency Phrases

**Files:**
- Modify: `frontend/src/api/mobileSummary.ts`
- Test: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Write minimal implementation**

Change `isUrgentItem` to:

```ts
function isUrgentItem(item: WardrobeSummaryItem): boolean {
  const text = itemSearchText(item);
  if (["不急", "不用急", "不着急", "not urgent"].some((term) => text.includes(term))) {
    return false;
  }
  return text.includes("明天要穿") || text.includes("急") || text.includes("urgent");
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-ignore-not-urgent-notes.md`
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
git add docs/superpowers/plans/2026-05-30-ignore-not-urgent-notes.md frontend/src/api/mobileSummary.ts frontend/src/api/mobileSummary.test.ts
git commit -m "fix: ignore not urgent notes"
```

Expected: a local-only commit. Do not push or upload.
