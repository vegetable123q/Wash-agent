# Guard Recommended Min Score Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent invalid `recommendedItemIds` thresholds such as `NaN` from filtering out every recommendation.

**Architecture:** Keep the guard inside the exported helper. Add a regression test using `Number.NaN`, then fall back invalid thresholds to `0`.

**Tech Stack:** TypeScript, Vitest, frequency advisor helper.

---

### Task 1: Guard Invalid Recommendation Thresholds

**Files:**
- Modify: `frontend/src/api/frequencyAdvisor.test.ts`
- Modify: `frontend/src/api/frequencyAdvisor.ts`

- [ ] **Step 1: Write the failing test**

Update the import in `frontend/src/api/frequencyAdvisor.test.ts`:

```ts
import { adviseFrequency, recommendedItemIds } from "./frequencyAdvisor";
```

Add this test:

```ts
it("falls back to zero when recommended item min score is invalid", () => {
  const item = planItem({ name: "white cotton tee", wearCount: 2 });

  expect(recommendedItemIds([item], constraints, Number.NaN)).toEqual(["item-1"]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- frequencyAdvisor.test.ts --run
```

Expected: FAIL because `score >= NaN` is false for every advice item.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/frequencyAdvisor.ts`, update `recommendedItemIds`:

```ts
const safeMinScore = Number.isFinite(minScore) ? minScore : 0;
```

Use `safeMinScore` in the filter.

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
git add docs/superpowers/plans/2026-05-30-guard-recommended-min-score.md frontend/src/api/frequencyAdvisor.test.ts frontend/src/api/frequencyAdvisor.ts
git commit -m "fix: guard recommended min score"
```

Expected: a local-only commit. Do not push or upload.
