# Preserve Summary Pricing Rules Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep shoe-washer and provider-specific pricing rules available in the integrated mobile summary.

**Architecture:** Preserve the existing embedded pricing configuration as the source of truth. Ensure the summary returned by `fetchMobileSummary()` passes through optional pricing rule groups instead of narrowing them to wash and dryer groups only.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/api/mobileSummary.test.ts`
  - Add regression coverage that `fetchMobileSummary()` exposes `shoe_washer_programs` and `provider_programs` in `campus_context.pricing_rules`.
- Modify: `frontend/src/api/mobileSummary.ts`
  - Return the full embedded pricing rule object from `campusPricingRules`.
  - Preserve all pricing rule groups when building the mobile summary payload.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the existing `fetchMobileSummary()` summary tests:

```ts
  it("keeps shoe washer and provider pricing rules in the mobile summary", async () => {
    const summary = await fetchMobileSummary();

    expect(summary.campus_context.pricing_rules.shoe_washer_programs).toEqual(PRICING_RULES.shoe_washer_programs);
    expect(summary.campus_context.pricing_rules.provider_programs).toEqual(PRICING_RULES.provider_programs);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: FAIL because the current summary `pricing_rules` only includes `wash_programs`, `dryer_programs`, and `source`.

---

### Task 2: Preserve Full Pricing Rules

**Files:**
- Modify: `frontend/src/api/mobileSummary.ts`
- Test: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Write minimal implementation**

Change the summary builder from:

```ts
pricing_rules: {
  wash_programs: campusContext.pricing_rules.wash_programs,
  dryer_programs: campusContext.pricing_rules.dryer_programs,
  source: "integrated",
},
```

to:

```ts
pricing_rules: {
  ...campusContext.pricing_rules,
  source: "integrated",
},
```

Change `campusPricingRules` so it includes optional embedded groups:

```ts
function campusPricingRules(): CampusContext["pricing_rules"] {
  return {
    wash_programs: PRICING_RULES.wash_programs,
    dryer_programs: PRICING_RULES.dryer_programs,
    shoe_washer_programs: PRICING_RULES.shoe_washer_programs,
    provider_programs: PRICING_RULES.provider_programs,
    washer_types: PRICING_RULES.washer_types,
    dryer_modes: PRICING_RULES.dryer_modes,
  };
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-preserve-summary-pricing-rules.md`
- Modify: `frontend/src/api/mobileSummary.ts`
- Modify: `frontend/src/api/mobileSummary.test.ts`

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
git add docs/superpowers/plans/2026-05-30-preserve-summary-pricing-rules.md frontend/src/api/mobileSummary.ts frontend/src/api/mobileSummary.test.ts
git commit -m "fix: preserve summary pricing rules"
```

Expected: a local-only commit. Do not push or upload.
