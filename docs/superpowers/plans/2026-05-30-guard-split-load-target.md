# Guard Split Load Target Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent `splitItemsByLaundryLoad` from over-splitting every item when called with an invalid target load.

**Architecture:** Share the same target normalization behavior used by washer-load counting. Add a regression test for zero target units, then introduce a small helper used by both exported functions.

**Tech Stack:** TypeScript, Vitest, laundry load estimation helper.

---

### Task 1: Guard Invalid Split Load Targets

**Files:**
- Modify: `frontend/src/api/laundryLoad.test.ts`
- Modify: `frontend/src/api/laundryLoad.ts`

- [ ] **Step 1: Write the failing test**

Update the import in `frontend/src/api/laundryLoad.test.ts`:

```ts
import { estimatedWasherLoadCount, estimateLaundryLoadUnits, loadPercentForItems, splitItemsByLaundryLoad } from "./laundryLoad";
```

Add this test:

```ts
it("falls back to the default target when splitting loads with invalid targets", () => {
  const items = [{ name: "hoodie" }, { name: "hoodie" }];

  expect(splitItemsByLaundryLoad(items, 0).map((chunk) => chunk.length)).toEqual([2]);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- laundryLoad.test.ts --run
```

Expected: FAIL because the current splitter treats zero as the threshold and splits after every item.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/laundryLoad.ts`, add:

```ts
function safeTargetUnits(targetUnits: number): number {
  return Number.isFinite(targetUnits) && targetUnits > 0 ? targetUnits : TARGET_WASHER_LOAD_UNITS;
}
```

Use it in both `estimatedWasherLoadCount` and `splitItemsByLaundryLoad`.

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
git add docs/superpowers/plans/2026-05-30-guard-split-load-target.md frontend/src/api/laundryLoad.test.ts frontend/src/api/laundryLoad.ts
git commit -m "fix: guard split load target"
```

Expected: a local-only commit. Do not push or upload.
