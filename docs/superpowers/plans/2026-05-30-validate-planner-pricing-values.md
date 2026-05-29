# Validate Planner Pricing Values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stop invalid pricing configuration values before they become `NaN` plan totals.

**Architecture:** Keep the existing pricing lookup flow. Add finite-number validation at the point where wash and dryer program values are read, so both cost and duration calculations share the same guard.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/api/laundryPlanner.test.ts`
  - Add regression coverage for invalid wash-program prices.
- Modify: `frontend/src/api/laundryPlanner.ts`
  - Validate `price_yuan` and `duration_minutes` after conversion with `Number(...)`.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/api/laundryPlanner.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test inside the existing `describe("planLaundry", ...)` block:

```ts
  it("rejects invalid pricing values instead of returning NaN totals", () => {
    const invalidContext: CampusContext = {
      ...context,
      pricing_rules: {
        ...context.pricing_rules,
        wash_programs: {
          ...context.pricing_rules.wash_programs,
          standard: { price_yuan: Number.NaN, duration_minutes: 40 },
        },
      },
    };

    expect(() => planLaundry([standardItem("tee-1", "white tee")], {
      selected_item_ids: ["tee-1"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, invalidContext)).toThrow("invalid wash program price_yuan: standard");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- laundryPlanner.test.ts --run`

Expected: FAIL because the current planner returns a plan with `NaN` cost instead of throwing.

---

### Task 2: Validate Program Numeric Values

**Files:**
- Modify: `frontend/src/api/laundryPlanner.ts`
- Test: `frontend/src/api/laundryPlanner.test.ts`

- [ ] **Step 1: Write minimal implementation**

In `washProgramValue`, replace `return Number(rule[key]);` with:

```ts
const value = Number(rule[key]);
if (!Number.isFinite(value)) {
  throw new Error(`invalid wash program ${key}: ${program}`);
}
return value;
```

In `dryerProgramValue`, replace `return Number(rule[key]);` with:

```ts
const value = Number(rule[key]);
if (!Number.isFinite(value)) {
  throw new Error(`invalid dryer program ${key}: ${program}`);
}
return value;
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- laundryPlanner.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-validate-planner-pricing-values.md`
- Modify: `frontend/src/api/laundryPlanner.ts`
- Modify: `frontend/src/api/laundryPlanner.test.ts`

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
git add docs/superpowers/plans/2026-05-30-validate-planner-pricing-values.md frontend/src/api/laundryPlanner.ts frontend/src/api/laundryPlanner.test.ts
git commit -m "fix: validate planner pricing values"
```

Expected: a local-only commit. Do not push or upload.
