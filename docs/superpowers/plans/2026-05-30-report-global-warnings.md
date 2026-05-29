# Report Global Warnings Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure planner-level global warnings, especially budget and wait constraints, appear in report data and the Report screen reminder cards.

**Architecture:** Keep the report generator as the canonical source for `risk_notes`, and make `ReportScreen` robust by also reading `plan.global_warnings` when an older or partial report omits those notes.

**Tech Stack:** TypeScript, Vitest, React 18.

---

## File Structure

- Modify: `frontend/src/api/reportGenerator.test.ts`
  - Assert generated `risk_notes` include user-facing global warnings.
- Modify: `frontend/src/api/reportGenerator.ts`
  - Add `plan.global_warnings` to `riskNotes`.
- Modify: `frontend/src/screens/ReportScreen.test.tsx`
  - Assert ReportScreen shows `plan.global_warnings` even when `report.risk_notes` is empty.
- Modify: `frontend/src/screens/ReportScreen.tsx`
  - Pass `plan.global_warnings` into `conciseReminders`.

---

### Task 1: Report Generator Risk Notes

**Files:**
- Modify: `frontend/src/api/reportGenerator.test.ts`
- Modify: `frontend/src/api/reportGenerator.ts`

- [ ] **Step 1: Write failing generator assertion**

Extend the existing report generator test to assert `report.risk_notes` includes the user-facing global wait warning.

Run: `npm test -- reportGenerator.test.ts --run`

Expected: FAIL because `riskNotes` currently omits `plan.global_warnings`.

- [ ] **Step 2: Include global warnings in risk notes**

Append `plan.global_warnings.map(userFacingWarning)` to `riskNotes` and keep de-duplication.

- [ ] **Step 3: Verify generator test passes**

Run: `npm test -- reportGenerator.test.ts --run`

Expected: PASS.

---

### Task 2: Report Screen Reminder Fallback

**Files:**
- Modify: `frontend/src/screens/ReportScreen.test.tsx`
- Modify: `frontend/src/screens/ReportScreen.tsx`

- [ ] **Step 1: Write failing screen test**

Add a test with `report.risk_notes: []` and `plan.global_warnings: ["预计费用 3.5 元超过预算 3 元。"]`; assert the reminder card shows the budget warning.

Run: `npm test -- ReportScreen.test.tsx --run`

Expected: FAIL because `ReportScreen` does not read `plan.global_warnings`.

- [ ] **Step 2: Pass global warnings to reminders**

Update `const reminders = conciseReminders(...)` to include `plan?.global_warnings`.

- [ ] **Step 3: Verify ReportScreen tests pass**

Run: `npm test -- ReportScreen.test.tsx --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused tests**

Run: `npm test -- reportGenerator.test.ts ReportScreen.test.tsx --run`

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
git add docs/superpowers/plans/2026-05-30-report-global-warnings.md frontend/src/api/reportGenerator.ts frontend/src/api/reportGenerator.test.ts frontend/src/screens/ReportScreen.tsx frontend/src/screens/ReportScreen.test.tsx
git commit -m "feat: surface report global warnings"
```

Expected: local commit succeeds. Do not run `git push`.
