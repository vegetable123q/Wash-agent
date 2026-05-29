# Dress Laundry Load Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Estimate dresses as larger-than-default laundry items so dirty-basket capacity is not undercounted.

**Architecture:** Add focused tests for `laundryLoad.ts` and extend `estimateLaundryLoadUnits` with a dress-specific branch. Keep the unit value conservative and aligned with pants/towels at 18 units.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add Laundry Load Tests

**Files:**
- Create: `frontend/src/api/laundryLoad.test.ts`

- [ ] **Step 1: Write the failing test**

Create:

```ts
import { describe, expect, it } from "vitest";
import { estimateLaundryLoadUnits, loadPercentForItems } from "./laundryLoad";

describe("laundryLoad", () => {
  it("estimates dresses as larger than default small garments", () => {
    const dress = { name: "赴云端连衣裙", category: "裙装" };

    expect(estimateLaundryLoadUnits(dress)).toBe(18);
    expect(loadPercentForItems([dress, dress, dress, dress, dress])).toBe(90);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- laundryLoad.test.ts --run`

Expected: FAIL because dresses currently return the default 12 units.

### Task 2: Add Dress Load Weight

**Files:**
- Modify: `frontend/src/api/laundryLoad.ts`

- [ ] **Step 1: Write minimal implementation**

Add this branch before pants:

```ts
  if (containsAny(text, ["连衣裙", "dress"])) return 18;
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- laundryLoad.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-dress-laundry-load.md`
- Create: `frontend/src/api/laundryLoad.test.ts`
- Modify: `frontend/src/api/laundryLoad.ts`

- [ ] **Step 1: Run related checks**

Run: `npm test -- laundryLoad.test.ts mobileSummary.test.ts DirtyBasketScreen.test.tsx --run`

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
git add docs/superpowers/plans/2026-05-30-dress-laundry-load.md frontend/src/api/laundryLoad.ts frontend/src/api/laundryLoad.test.ts
git commit -m "fix: estimate dress laundry load"
```
