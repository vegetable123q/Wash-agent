# Trim Frequency Urgent IDs Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure urgent wash-frequency boosts still apply when urgent item ids contain harmless surrounding whitespace.

**Architecture:** Keep the normalization inside `adviseFrequency`. Add a regression test with a whitespace-padded urgent id, then compare against a trimmed id set.

**Tech Stack:** TypeScript, Vitest, frequency advisor helper.

---

### Task 1: Trim Urgent Item IDs

**Files:**
- Modify: `frontend/src/api/frequencyAdvisor.test.ts`
- Modify: `frontend/src/api/frequencyAdvisor.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `frontend/src/api/frequencyAdvisor.test.ts`:

```ts
it("trims urgent item ids before matching", () => {
  const advice = adviseFrequency(planItem({ name: "white cotton tee", wearCount: 0 }), {
    ...constraints,
    urgent_item_ids: [" item-1 "],
  });

  expect(advice.priority_score).toBeGreaterThanOrEqual(25);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- frequencyAdvisor.test.ts --run
```

Expected: FAIL because the current implementation checks `includes` against the raw id strings.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/frequencyAdvisor.ts`, add:

```ts
const urgentItemIds = new Set(constraints.urgent_item_ids.map((id) => id.trim()).filter(Boolean));
```

Then replace:

```ts
constraints.urgent_item_ids.includes(item.profile.item_id)
```

with:

```ts
urgentItemIds.has(item.profile.item_id)
```

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- frequencyAdvisor.test.ts --run
```

Expected: PASS for all frequency advisor tests.

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
git add docs/superpowers/plans/2026-05-30-trim-frequency-urgent-ids.md frontend/src/api/frequencyAdvisor.test.ts frontend/src/api/frequencyAdvisor.ts
git commit -m "fix: trim frequency urgent ids"
```

Expected: a local-only commit. Do not push or upload.
