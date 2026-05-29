# Normalize Frequency Wear Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent negative or invalid wear counts from appearing in wash-frequency recommendation reasons.

**Architecture:** Keep the normalization inside `adviseFrequency` so direct callers are protected even when they bypass local-storage normalization. Add a regression test for a negative wear count, then use a local nonnegative integer helper for comparisons and reason text.

**Tech Stack:** TypeScript, Vitest, frequency advisor helper.

---

### Task 1: Normalize Negative Wear Counts

**Files:**
- Modify: `frontend/src/api/frequencyAdvisor.test.ts`
- Modify: `frontend/src/api/frequencyAdvisor.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `frontend/src/api/frequencyAdvisor.test.ts`:

```ts
it("normalizes negative wear counts before building reasons", () => {
  const advice = adviseFrequency(planItem({ name: "white cotton tee", wearCount: -1 }), constraints);

  expect(advice.reasons[0]).toContain("已穿 0 次");
  expect(advice.reasons[0]).not.toContain("-1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- frequencyAdvisor.test.ts --run
```

Expected: FAIL because the current implementation prints the raw negative wear count.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/frequencyAdvisor.ts`, add:

```ts
const wearCount = nonNegativeInteger(item.wear_count_since_wash);
```

Use `wearCount` in threshold comparisons and reason text.

Add:

```ts
function nonNegativeInteger(value: number): number {
  return Number.isFinite(value) && value > 0 ? Math.floor(value) : 0;
}
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
git add docs/superpowers/plans/2026-05-30-normalize-frequency-wear-count.md frontend/src/api/frequencyAdvisor.test.ts frontend/src/api/frequencyAdvisor.ts
git commit -m "fix: normalize frequency wear count"
```

Expected: a local-only commit. Do not push or upload.
