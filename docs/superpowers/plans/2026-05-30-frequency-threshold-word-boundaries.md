# Frequency Threshold Word Boundaries Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent short English frequency terms such as `tee` from matching inside unrelated words such as `steel`.

**Architecture:** Keep threshold logic in `frequencyAdvisor.ts`. Use boundary-aware matching for ASCII threshold terms and retain substring matching for Chinese terms.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add False-Positive Regression Coverage

**Files:**
- Modify: `frontend/src/api/frequencyAdvisor.test.ts`

- [ ] **Step 1: Write the failing test**

Add:

```ts
  it("does not match short English threshold terms inside unrelated words", () => {
    const advice = adviseFrequency(planItem({ name: "steel gray jacket", wearCount: 2 }), constraints);

    expect(advice.priority_score).toBe(0);
    expect(advice.reasons[0]).toContain("未达到建议清洗阈值 4 次");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frequencyAdvisor.test.ts --run`

Expected: FAIL because `steel` currently contains `tee`, so the item uses a 2-wear threshold.

### Task 2: Add Boundary-Aware Threshold Matching

**Files:**
- Modify: `frontend/src/api/frequencyAdvisor.ts`

- [ ] **Step 1: Write minimal implementation**

Change `thresholdFor` to call `thresholdTermMatches(text, term)` instead of `text.includes(term)`.

Add helpers:

```ts
function thresholdTermMatches(text: string, term: string): boolean {
  if (/^[a-z0-9 -]+$/i.test(term)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(term);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- frequencyAdvisor.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-frequency-threshold-word-boundaries.md`
- Modify: `frontend/src/api/frequencyAdvisor.ts`
- Modify: `frontend/src/api/frequencyAdvisor.test.ts`

- [ ] **Step 1: Run related checks**

Run: `npm test -- frequencyAdvisor.test.ts mobileSummary.test.ts WardrobeScreen.test.tsx --run`

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
git add docs/superpowers/plans/2026-05-30-frequency-threshold-word-boundaries.md frontend/src/api/frequencyAdvisor.ts frontend/src/api/frequencyAdvisor.test.ts
git commit -m "fix: avoid frequency threshold substring matches"
```
