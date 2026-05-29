# Report Reminder Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent internal machine identifiers such as `standard_washer` from appearing in Report screen reminder cards when reminders come directly from `plan.global_warnings`.

**Architecture:** Keep the cleanup local to `ReportScreen` by extending `cleanReminder`. This benefits all reminder sources without changing planner or report data contracts.

**Tech Stack:** React 18, TypeScript, Vitest.

---

## File Structure

- Modify: `frontend/src/screens/ReportScreen.test.tsx`
  - Add a regression test for global warnings containing `standard_washer`.
- Modify: `frontend/src/screens/ReportScreen.tsx`
  - Replace internal machine ids and program ids inside `cleanReminder`.

---

### Task 1: Friendly Reminder Test

**Files:**
- Modify: `frontend/src/screens/ReportScreen.test.tsx`

- [ ] **Step 1: Write failing test**

Add a test with `plan.global_warnings: ["standard_washer 等待时间未知，无法确认是否满足最大等待 10 分钟。"]` and empty `report.risk_notes`; assert the reminder shows `洗衣机 等待时间未知` and the page does not contain `standard_washer`.

Run: `npm test -- ReportScreen.test.tsx --run`

Expected: FAIL because `cleanReminder` does not replace machine ids yet.

---

### Task 2: Reminder Cleanup Implementation

**Files:**
- Modify: `frontend/src/screens/ReportScreen.tsx`

- [ ] **Step 1: Extend `cleanReminder` replacements**

Add replacements for:
- `standard_washer` -> `洗衣机`
- `shoe_washer` -> `洗鞋机`
- `dryer` -> `烘干机`
- common `程序 standard|quick|large|low` labels

- [ ] **Step 2: Verify ReportScreen tests pass**

Run: `npm test -- ReportScreen.test.tsx --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused tests**

Run: `npm test -- ReportScreen.test.tsx reportGenerator.test.ts --run`

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
git add docs/superpowers/plans/2026-05-30-report-reminder-labels.md frontend/src/screens/ReportScreen.tsx frontend/src/screens/ReportScreen.test.tsx
git commit -m "fix: clean report reminder labels"
```

Expected: local commit succeeds. Do not run `git push`.
