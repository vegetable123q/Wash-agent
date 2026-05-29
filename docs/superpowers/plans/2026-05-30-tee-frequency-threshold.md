# Tee Frequency Threshold Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Treat English `tee`/`tshirt` items as T-shirts with a 2-wear cleaning threshold.

**Architecture:** Add a focused `frequencyAdvisor` test and extend the existing `FREQUENCY_THRESHOLDS` dictionary. Keep the scoring formula unchanged.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add Tee Threshold Regression Coverage

**Files:**
- Create: `frontend/src/api/frequencyAdvisor.test.ts`

- [ ] **Step 1: Write the failing test**

Create:

```ts
import { describe, expect, it } from "vitest";
import { adviseFrequency } from "./frequencyAdvisor";
import type { LaundryConstraints, WardrobeItemForPlan } from "./types";

describe("frequencyAdvisor", () => {
  it("uses a T-shirt threshold for English tee names", () => {
    const advice = adviseFrequency(planItem({ name: "white cotton tee", wearCount: 2 }), constraints);

    expect(advice.priority_score).toBeGreaterThanOrEqual(45);
    expect(advice.reasons[0]).toContain("达到建议清洗阈值 2 次");
  });
});
```

Include small `constraints` and `planItem` helpers in the test file.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- frequencyAdvisor.test.ts --run`

Expected: FAIL because `tee` currently falls back to the default 4-wear threshold.

### Task 2: Add Tee Terms to Thresholds

**Files:**
- Modify: `frontend/src/api/frequencyAdvisor.ts`

- [ ] **Step 1: Write minimal implementation**

Add to `FREQUENCY_THRESHOLDS` near the T-shirt entries:

```ts
  tee: 2,
  tshirt: 2,
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- frequencyAdvisor.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-tee-frequency-threshold.md`
- Create: `frontend/src/api/frequencyAdvisor.test.ts`
- Modify: `frontend/src/api/frequencyAdvisor.ts`

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
git add docs/superpowers/plans/2026-05-30-tee-frequency-threshold.md frontend/src/api/frequencyAdvisor.ts frontend/src/api/frequencyAdvisor.test.ts
git commit -m "fix: classify tee frequency threshold"
```
