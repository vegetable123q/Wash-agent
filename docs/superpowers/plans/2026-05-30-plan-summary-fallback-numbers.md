# Plan Summary Fallback Numbers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make deterministic plan-summary fallback text avoid rendering invalid estimate values such as `¥NaN` or `1.5 分钟`.

**Architecture:** Add local formatting guards in `fallbackPlanSummary`. Costs must be finite non-negative numbers; durations must be finite positive integers.

**Tech Stack:** TypeScript, Vitest, Vite, `npm`.

---

### Task 1: Guard fallback plan-summary estimates

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-plan-summary-fallback-numbers.md`
- Modify: `frontend/src/api/llmSummary.test.ts`
- Modify: `frontend/src/api/llmSummary.ts`

- [x] **Step 1: Add failing fallback summary coverage**

Import `generatePlanSummary` and `emptyModelHubConfig`, then add a test with:

```ts
estimated_cost_yuan: Number.NaN,
estimated_duration_minutes: 1.5,
```

Assert the fallback text does not contain `NaN` or `1.5`.

Run from `frontend`:

```bash
npm test -- src/api/llmSummary.test.ts
```

Expected: FAIL because fallback summary currently renders invalid estimates directly.

- [x] **Step 2: Implement guarded fallback formatting**

In `fallbackPlanSummary`, format cost and duration through guard helpers:

```ts
const cost = isFiniteNonNegativeNumber(plan.estimated_cost_yuan)
  ? `预计费用 ¥${plan.estimated_cost_yuan}`
  : "费用待确认";
const duration = isValidDuration(plan.estimated_duration_minutes)
  ? `，机器占用约 ${plan.estimated_duration_minutes} 分钟`
  : "";
```

- [x] **Step 3: Run target and full frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/llmSummary.test.ts
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
git add docs/superpowers/plans/2026-05-30-plan-summary-fallback-numbers.md frontend/src/api/llmSummary.test.ts frontend/src/api/llmSummary.ts
git commit -m "fix: guard plan summary fallback numbers"
```

Expected: one local commit. Do not push or upload.
