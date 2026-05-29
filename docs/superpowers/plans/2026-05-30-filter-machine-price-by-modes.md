# Filter Machine Price By Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show configured machine list prices using only the programs a live machine says it supports.

**Architecture:** Keep `machineProgramOptions` as the detailed program source. Update the list-price helper so it applies the same `machine.modes` filtering before formatting a configured price range, while machines with an empty `modes` list continue to show the full configured range.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Create: `frontend/src/api/machinePricing.test.ts`
  - Add focused coverage for `machinePriceText` when a machine has a non-empty `modes` list.
- Modify: `frontend/src/api/machinePricing.ts`
  - Pass the whole machine into configured price collection and filter configured programs by supported modes.

---

### Task 1: Add Regression Coverage

**Files:**
- Create: `frontend/src/api/machinePricing.test.ts`

- [ ] **Step 1: Write the failing test**

Create this test file:

```ts
import { describe, expect, it } from "vitest";
import { machinePriceText } from "./machinePricing";
import type { BackendMachine } from "./types";

describe("machinePricing", () => {
  it("formats list price from supported machine modes", () => {
    const machine: BackendMachine = {
      machine_id: "washer-1",
      location: "1F",
      machine_type: "standard_washer",
      status: "available",
      remaining_minutes: null,
      price_yuan: null,
      modes: ["standard"],
    };

    const priceText = machinePriceText(machine, {
      wash_programs: {
        quick: { price_yuan: 3, duration_minutes: 30 },
        standard: { price_yuan: 3.5, duration_minutes: 40 },
        large: { price_yuan: 4, duration_minutes: 50 },
      },
      dryer_programs: {},
    });

    expect(priceText).toContain("3.5");
    expect(priceText).not.toContain("3-4");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- machinePricing.test.ts --run`

Expected: FAIL because the current list-price helper ignores `machine.modes` and formats the full `3-4` range.

---

### Task 2: Filter Configured Prices By Supported Modes

**Files:**
- Modify: `frontend/src/api/machinePricing.ts`
- Test: `frontend/src/api/machinePricing.test.ts`

- [ ] **Step 1: Write minimal implementation**

Change `machinePriceText` to call a machine-aware helper:

```ts
const prices = configuredPricesForMachine(machine, pricingRules);
```

Replace `configuredPricesForMachineType` with:

```ts
function configuredPricesForMachine(machine: BackendMachine, pricingRules?: PricingRulesLike | null): number[] {
  const supportedModes = machine.modes.length ? new Set(machine.modes) : null;
  return configuredProgramsForMachine(machine.machine_type, machine.provider, pricingRules)
    .filter(([programId]) => !supportedModes || supportedModes.has(programId))
    .map(([, program]) => program.price_yuan)
    .filter((price, index, allPrices) => allPrices.indexOf(price) === index)
    .sort((left, right) => left - right);
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- machinePricing.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-filter-machine-price-by-modes.md`
- Create: `frontend/src/api/machinePricing.test.ts`
- Modify: `frontend/src/api/machinePricing.ts`

- [ ] **Step 1: Run full frontend tests**

Run: `npm test -- --run`

Expected: PASS with all frontend test files green.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS with TypeScript and Vite build completing successfully.

- [ ] **Step 3: Check whitespace**

Run: `git diff --check`

Expected: exit code 0.

- [ ] **Step 4: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-filter-machine-price-by-modes.md frontend/src/api/machinePricing.ts frontend/src/api/machinePricing.test.ts
git commit -m "fix: filter machine prices by modes"
```

Expected: a local-only commit. Do not push or upload.
