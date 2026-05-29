# Today Preference Chips Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show saved budget and maximum wait preferences in the Today screen constraint row so users can see the planner constraints currently in effect.

**Architecture:** Reuse the existing `UserProfile` fields and Today screen constraint-row rendering. This is a presentation-only change; planning behavior remains in `mobileSummary`.

**Tech Stack:** React 18, TypeScript, Vitest.

---

## File Structure

- Modify: `frontend/src/screens/TodayScreen.test.tsx`
  - Add a focused test for budget and max-wait chips.
- Modify: `frontend/src/screens/TodayScreen.tsx`
  - Include `budgetYuan` and `maxWaitMinutes` in personal-context detection.
  - Append user-facing constraint labels when those values are present.

---

### Task 1: Today Constraint Row Test

**Files:**
- Modify: `frontend/src/screens/TodayScreen.test.tsx`

- [ ] **Step 1: Write failing test**

Add a test that renders `TodayScreen` with `budgetYuan: 12.5` and `maxWaitMinutes: 8`, then asserts the constraint row contains `预算 ¥12.5` and `最长等待 8 分钟`.

Run: `npm test -- TodayScreen.test.tsx --run`

Expected: FAIL because the Today screen does not show these constraints yet.

---

### Task 2: Today Constraint Row Implementation

**Files:**
- Modify: `frontend/src/screens/TodayScreen.tsx`

- [ ] **Step 1: Add labels from profile preferences**

Update `hasPersonalContext` and the `constraints` array to include:
- `预算 ¥<budget>` when `budgetYuan` is present.
- `最长等待 <minutes> 分钟` when `maxWaitMinutes` is present.

- [ ] **Step 2: Verify Today screen test passes**

Run: `npm test -- TodayScreen.test.tsx --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused frontend tests**

Run: `npm test -- TodayScreen.test.tsx userProfile.test.ts mobileSummary.test.ts --run`

Expected: PASS.

- [ ] **Step 2: Run frontend build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Create a local-only commit**

Run:

```powershell
git add docs/superpowers/plans/2026-05-30-today-preference-chips.md frontend/src/screens/TodayScreen.tsx frontend/src/screens/TodayScreen.test.tsx
git commit -m "feat: show laundry preferences on today"
```

Expected: local commit succeeds. Do not run `git push`.
