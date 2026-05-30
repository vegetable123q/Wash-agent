# Today Advice Fallback Cost Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make deterministic Today advice fallback text avoid rendering invalid costs such as `¥NaN`.

**Architecture:** Reuse the existing non-negative finite number guard in `fallbackTodayAdvice` before formatting plan cost.

**Tech Stack:** TypeScript, Vitest, Vite, `npm`.

---

### Task 1: Guard fallback Today advice cost

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-today-advice-fallback-cost.md`
- Modify: `frontend/src/api/llmSummary.test.ts`
- Modify: `frontend/src/api/llmSummary.ts`

- [x] **Step 1: Add failing fallback advice coverage**

Import `generateTodayAdvice`, then add a test with:

```ts
estimated_cost_yuan: Number.NaN,
```

Assert the fallback text does not contain `NaN`.

Run from `frontend`:

```bash
npm test -- src/api/llmSummary.test.ts
```

Expected: FAIL because Today advice fallback currently renders invalid costs directly.

- [x] **Step 2: Implement guarded Today advice cost formatting**

In `fallbackTodayAdvice`, format cost through the existing guard:

```ts
const cost = isFiniteNonNegativeNumber(plan.estimated_cost_yuan)
  ? `预计 ¥${plan.estimated_cost_yuan}`
  : "费用待确认";
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
git add docs/superpowers/plans/2026-05-30-today-advice-fallback-cost.md frontend/src/api/llmSummary.test.ts frontend/src/api/llmSummary.ts
git commit -m "fix: guard today advice fallback cost"
```

Expected: one local commit. Do not push or upload.
