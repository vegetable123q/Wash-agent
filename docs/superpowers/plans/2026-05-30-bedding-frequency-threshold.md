# Bedding Frequency Threshold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Treat English `sheet`, `sheets`, and `duvet` names as bedding with a 1-use cleaning threshold.

**Architecture:** Extend the existing `frequencyAdvisor` test file and dictionary. Keep scoring behavior unchanged.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add Bedding Threshold Regression Coverage

**Files:**
- Modify: `frontend/src/api/frequencyAdvisor.test.ts`

- [ ] **Step 1: Write the failing test**

Add:

```ts
  it("uses a bedding threshold for English sheet names", () => {
    const advice = adviseFrequency(planItem({ name: "cotton bed sheet", wearCount: 1 }), constraints);

    expect(advice.priority_score).toBeGreaterThanOrEqual(45);
    expect(advice.reasons[0]).toContain("达到建议清洗阈值 1 次");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frequencyAdvisor.test.ts --run`

Expected: FAIL because `sheet` currently falls back to the default 4-wear threshold.

### Task 2: Add English Bedding Terms

**Files:**
- Modify: `frontend/src/api/frequencyAdvisor.ts`

- [ ] **Step 1: Write minimal implementation**

Add to `FREQUENCY_THRESHOLDS` near `bedding`:

```ts
  sheet: 1,
  sheets: 1,
  duvet: 1,
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- frequencyAdvisor.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-bedding-frequency-threshold.md`
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
git add docs/superpowers/plans/2026-05-30-bedding-frequency-threshold.md frontend/src/api/frequencyAdvisor.ts frontend/src/api/frequencyAdvisor.test.ts
git commit -m "fix: classify bedding frequency threshold"
```
