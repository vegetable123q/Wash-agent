# Guard Washer Load Target Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent `estimatedWasherLoadCount` from returning `Infinity` when called with an invalid target load.

**Architecture:** Keep the guard local to the exported washer-load count helper. Add a regression test for zero target units, then fall back to the default target when the supplied value is not a positive finite number.

**Tech Stack:** TypeScript, Vitest, laundry load estimation helper.

---

### Task 1: Guard Invalid Washer Load Targets

**Files:**
- Modify: `frontend/src/api/laundryLoad.test.ts`
- Modify: `frontend/src/api/laundryLoad.ts`

- [ ] **Step 1: Write the failing test**

Update the import in `frontend/src/api/laundryLoad.test.ts`:

```ts
import { estimatedWasherLoadCount, estimateLaundryLoadUnits, loadPercentForItems } from "./laundryLoad";
```

Add this test:

```ts
it("falls back to the default target for invalid washer load targets", () => {
  const items = [{ name: "tee" }];

  expect(estimatedWasherLoadCount(items, 0)).toBe(1);
  expect(Number.isFinite(estimatedWasherLoadCount(items, 0))).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- laundryLoad.test.ts --run
```

Expected: FAIL because the current implementation divides by zero and returns `Infinity`.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/laundryLoad.ts`, update `estimatedWasherLoadCount`:

```ts
const safeTargetUnits = Number.isFinite(targetUnits) && targetUnits > 0 ? targetUnits : TARGET_WASHER_LOAD_UNITS;
return Math.max(1, Math.ceil(totalUnits / safeTargetUnits));
```

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- laundryLoad.test.ts --run
```

Expected: PASS for all laundry load tests.

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
git add docs/superpowers/plans/2026-05-30-guard-washer-load-target.md frontend/src/api/laundryLoad.test.ts frontend/src/api/laundryLoad.ts
git commit -m "fix: guard washer load target"
```

Expected: a local-only commit. Do not push or upload.
