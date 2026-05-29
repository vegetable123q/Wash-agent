# Ignore Invalid Machine Price Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent invalid direct machine prices from rendering as `NaN` in the machine list.

**Architecture:** Keep direct machine prices as the first choice when they are valid. Treat non-finite numbers as missing direct prices so the existing configured-pricing fallback can provide a usable display.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/api/machinePricing.test.ts`
  - Add coverage for `price_yuan: Number.NaN` falling back to configured prices.
- Modify: `frontend/src/api/machinePricing.ts`
  - Require direct machine prices to be finite before formatting them.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/api/machinePricing.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test inside the existing `describe("machinePricing", ...)` block:

```ts
  it("falls back to configured prices when direct machine price is invalid", () => {
    const machine: BackendMachine = {
      machine_id: "washer-1",
      location: "1F",
      machine_type: "standard_washer",
      status: "available",
      remaining_minutes: null,
      price_yuan: Number.NaN,
      modes: ["standard"],
    };

    const priceText = machinePriceText(machine, {
      wash_programs: {
        standard: { price_yuan: 3.5, duration_minutes: 40 },
      },
      dryer_programs: {},
    });

    expect(priceText).toContain("3.5");
    expect(priceText).not.toContain("NaN");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- machinePricing.test.ts --run`

Expected: FAIL because the current direct-price branch formats `NaN`.

---

### Task 2: Ignore Non-Finite Direct Prices

**Files:**
- Modify: `frontend/src/api/machinePricing.ts`
- Test: `frontend/src/api/machinePricing.test.ts`

- [ ] **Step 1: Write minimal implementation**

Change the direct-price guard from:

```ts
if (typeof machine.price_yuan === "number") {
```

to:

```ts
if (typeof machine.price_yuan === "number" && Number.isFinite(machine.price_yuan)) {
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- machinePricing.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-ignore-invalid-machine-price.md`
- Modify: `frontend/src/api/machinePricing.ts`
- Modify: `frontend/src/api/machinePricing.test.ts`

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
git add docs/superpowers/plans/2026-05-30-ignore-invalid-machine-price.md frontend/src/api/machinePricing.ts frontend/src/api/machinePricing.test.ts
git commit -m "fix: ignore invalid machine prices"
```

Expected: a local-only commit. Do not push or upload.
