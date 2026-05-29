# Plan Global Warnings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show non-duplicated `plan.global_warnings` on the Plan Detail screen so budget and maximum-wait constraint warnings are visible before execution.

**Architecture:** Keep warnings inside the existing Plan Detail presentation component. Bucket-level warnings remain attached to bucket rows; global warnings are filtered to avoid duplicating those bucket warnings and rendered in a separate section.

**Tech Stack:** React 18, TypeScript, Vitest.

---

## File Structure

- Modify: `frontend/src/screens/PlanDetailScreen.test.tsx`
  - Add a test for budget/wait global warnings.
- Modify: `frontend/src/screens/PlanDetailScreen.tsx`
  - Derive non-duplicated global warnings from `mobileSummary.plan.global_warnings`.
  - Render them with user-facing machine labels.

---

### Task 1: Plan Detail Warning Test

**Files:**
- Modify: `frontend/src/screens/PlanDetailScreen.test.tsx`

- [ ] **Step 1: Write failing test**

Add a test that renders `PlanDetailScreen` with `global_warnings` containing an over-budget warning and a `standard_washer` wait warning, then asserts the page shows a `本次约束提醒` section, includes budget text, and does not expose raw `standard_washer`.

Run: `npm test -- PlanDetailScreen.test.tsx --run`

Expected: FAIL because global warnings are not rendered yet.

---

### Task 2: Plan Detail Warning UI

**Files:**
- Modify: `frontend/src/screens/PlanDetailScreen.tsx`

- [ ] **Step 1: Derive non-duplicated global warnings**

Create a memoized `globalWarningRows` list by filtering out warnings already present in bucket rows, then mapping remaining warnings through `userFacingWarning`.

- [ ] **Step 2: Render warning section**

Render `Section title="本次约束提醒"` only when `globalWarningRows.length > 0`, using orange warning cards.

- [ ] **Step 3: Verify Plan Detail tests pass**

Run: `npm test -- PlanDetailScreen.test.tsx --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused tests**

Run: `npm test -- PlanDetailScreen.test.tsx mobileSummary.test.ts --run`

Expected: PASS.

- [ ] **Step 2: Run full frontend tests**

Run: `npm test -- --run`

Expected: PASS.

- [ ] **Step 3: Run frontend build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Create a local-only commit**

Run:

```powershell
git add docs/superpowers/plans/2026-05-30-plan-global-warnings.md frontend/src/screens/PlanDetailScreen.tsx frontend/src/screens/PlanDetailScreen.test.tsx
git commit -m "feat: show plan global warnings"
```

Expected: local commit succeeds. Do not run `git push`.
