# Ignore Nonpositive Configured Durations Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent configured program durations at or below zero from appearing in machine program options.

**Architecture:** Reuse the existing program pricing validator so both price ranges and option lists share the same sanity checks. Add a regression test for `machineProgramOptions`, then require `duration_minutes` to be positive.

**Tech Stack:** TypeScript, Vitest, machine pricing display helper.

---

### Task 1: Filter Nonpositive Configured Durations

**Files:**
- Modify: `frontend/src/api/machinePricing.test.ts`
- Modify: `frontend/src/api/machinePricing.ts`

- [ ] **Step 1: Write the failing test**

Update the import in `frontend/src/api/machinePricing.test.ts`:

```ts
import { machinePriceText, machineProgramOptions } from "./machinePricing";
```

Add this test:

```ts
it("ignores configured programs with nonpositive durations", () => {
  const machine: BackendMachine = {
    machine_id: "washer-1",
    location: "1F",
    machine_type: "standard_washer",
    status: "available",
    remaining_minutes: null,
    price_yuan: null,
    modes: [],
  };

  const options = machineProgramOptions(machine, {
    wash_programs: {
      quick: { price_yuan: 3, duration_minutes: -5 },
      standard: { price_yuan: 3.5, duration_minutes: 40 },
    },
    dryer_programs: {},
  });

  expect(options.map((option) => option.id)).toEqual(["standard"]);
  expect(JSON.stringify(options)).not.toContain("-5");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- machinePricing.test.ts --run
```

Expected: FAIL because the current validator accepts finite negative durations.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/machinePricing.ts`, update `isProgramPricing`:

```ts
&& value.duration_minutes > 0
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
git add docs/superpowers/plans/2026-05-30-ignore-nonpositive-configured-durations.md frontend/src/api/machinePricing.test.ts frontend/src/api/machinePricing.ts
git commit -m "fix: ignore nonpositive configured durations"
```

Expected: a local-only commit. Do not push or upload.
