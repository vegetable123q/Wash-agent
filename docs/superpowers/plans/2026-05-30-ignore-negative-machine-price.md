# Ignore Negative Machine Price Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent directly reported negative machine prices from being shown to users.

**Architecture:** Keep the fix in `machinePriceText`. Add a regression test that falls back from a negative direct price to configured pricing, then require direct machine prices to be nonnegative before formatting them.

**Tech Stack:** TypeScript, Vitest, machine pricing display helper.

---

### Task 1: Ignore Negative Direct Machine Prices

**Files:**
- Modify: `frontend/src/api/machinePricing.test.ts`
- Modify: `frontend/src/api/machinePricing.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `frontend/src/api/machinePricing.test.ts`:

```ts
it("falls back to configured prices when direct machine price is negative", () => {
  const machine: BackendMachine = {
    machine_id: "washer-1",
    location: "1F",
    machine_type: "standard_washer",
    status: "available",
    remaining_minutes: null,
    price_yuan: -1,
    modes: ["standard"],
  };

  const priceText = machinePriceText(machine, {
    wash_programs: {
      standard: { price_yuan: 3.5, duration_minutes: 40 },
    },
    dryer_programs: {},
  });

  expect(priceText).toContain("3.5");
  expect(priceText).not.toContain("-1");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- machinePricing.test.ts --run
```

Expected: FAIL because the current implementation formats `¥-1` directly.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/machinePricing.ts`, update the direct price guard:

```ts
if (typeof machine.price_yuan === "number" && Number.isFinite(machine.price_yuan) && machine.price_yuan >= 0) {
```

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- machinePricing.test.ts --run
```

Expected: PASS for all machine pricing tests.

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
git add docs/superpowers/plans/2026-05-30-ignore-negative-machine-price.md frontend/src/api/machinePricing.test.ts frontend/src/api/machinePricing.ts
git commit -m "fix: ignore negative machine price"
```

Expected: a local-only commit. Do not push or upload.
