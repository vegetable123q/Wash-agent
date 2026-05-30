# Frontend Planner Integer Max Wait Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the frontend laundry planner ignore fractional `max_wait_minutes` constraints while still honoring decimal budgets.

**Architecture:** Keep budget parsing and wait parsing separate in `laundryPlanner.ts`. Budget uses a finite non-negative number helper; max wait uses a finite non-negative integer helper.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Enforce integer max wait constraints in frontend planner

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-frontend-planner-integer-max-wait.md`
- Modify: `frontend/src/api/laundryPlanner.test.ts`
- Modify: `frontend/src/api/laundryPlanner.ts`

- [x] **Step 1: Add failing planner coverage**

Add a test where queue wait is `2`, budget is decimal `3.25`, and constraints include:

```ts
max_wait_minutes: 1.5,
budget_yuan: 3.25,
```

Assert budget warning still mentions `3.25`, while wait warning does not mention `1.5`.

Run from `frontend`:

```bash
npm test -- src/api/laundryPlanner.test.ts
```

Expected: FAIL because fractional max wait currently generates a wait warning.

- [x] **Step 2: Implement integer wait constraint parsing**

Add:

```ts
function nonNegativeIntegerConstraintNumber(value: number | null): number | null {
  const numberValue = nonNegativeConstraintNumber(value);
  return numberValue != null && Number.isInteger(numberValue) ? numberValue : null;
}
```

Use it only for `constraints.max_wait_minutes`.

- [x] **Step 3: Run target and frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/laundryPlanner.test.ts
npm test
```

Run from repo root:

```bash
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 4: Commit locally**

Run from repo root:

```bash
git add docs/superpowers/plans/2026-05-30-frontend-planner-integer-max-wait.md frontend/src/api/laundryPlanner.test.ts frontend/src/api/laundryPlanner.ts
git commit -m "fix: require integer frontend wait constraints"
```

Expected: one local commit. Do not push or upload.
