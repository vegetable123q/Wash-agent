# Ignore Negative Configured Prices Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent configured program prices below zero from appearing in machine price ranges.

**Architecture:** Keep validation inside `isProgramPricing`, which feeds both price ranges and program option display. Add a regression test for mixed valid and negative configured prices, then require configured `price_yuan` values to be nonnegative.

**Tech Stack:** TypeScript, Vitest, machine pricing display helper.

---

### Task 1: Filter Negative Configured Prices

**Files:**
- Modify: `frontend/src/api/machinePricing.test.ts`
- Modify: `frontend/src/api/machinePricing.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `frontend/src/api/machinePricing.test.ts`:

```ts
it("ignores negative configured prices in price ranges", () => {
  const machine: BackendMachine = {
    machine_id: "washer-1",
    location: "1F",
    machine_type: "standard_washer",
    status: "available",
    remaining_minutes: null,
    price_yuan: null,
    modes: [],
  };

  const priceText = machinePriceText(machine, {
    wash_programs: {
      quick: { price_yuan: -1, duration_minutes: 30 },
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

Expected: FAIL because the current configured price filter accepts finite negative prices.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/machinePricing.ts`, update `isProgramPricing`:

```ts
&& value.price_yuan >= 0
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
git add docs/superpowers/plans/2026-05-30-ignore-negative-configured-prices.md frontend/src/api/machinePricing.test.ts frontend/src/api/machinePricing.ts
git commit -m "fix: ignore negative configured prices"
```

Expected: a local-only commit. Do not push or upload.
