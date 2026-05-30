# Machine Pricing Integer Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ignore configured machine programs with fractional `duration_minutes` values instead of showing text like `1.5 分`.

**Architecture:** Tighten `isProgramPricing`; program durations must be finite positive integers before they can be displayed or included in price ranges.

**Tech Stack:** TypeScript, Vitest, Vite, `npm`.

---

### Task 1: Require integer program durations

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-machine-pricing-integer-duration.md`
- Modify: `frontend/src/api/machinePricing.test.ts`
- Modify: `frontend/src/api/machinePricing.ts`

- [x] **Step 1: Add failing fractional duration coverage**

Update the invalid duration test to use:

```ts
quick: { price_yuan: 3, duration_minutes: 1.5 },
```

and assert the `quick` program is ignored.

Run from `frontend`:

```bash
npm test -- src/api/machinePricing.test.ts
```

Expected: FAIL because fractional durations currently count as valid program pricing.

- [x] **Step 2: Implement positive integer duration validation**

In `isProgramPricing`, require:

```ts
Number.isInteger(value.duration_minutes)
```

- [x] **Step 3: Run target and full frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/machinePricing.test.ts
npm test
npm run build
```

Run from repo root:

```bash
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 4: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-machine-pricing-integer-duration.md frontend/src/api/machinePricing.test.ts frontend/src/api/machinePricing.ts
git commit -m "fix: require integer program durations"
```

Expected: one local commit. Do not push or upload.
