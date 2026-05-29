# Add Clothing Clear Save Error Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Clear stale save errors on the Add Clothing form after the user edits a draft field.

**Architecture:** Keep the behavior local to `AddClothingScreen`. The screen already has a central `updateDraft` helper for form edits, so clearing the save error there keeps the change small and consistent.

**Tech Stack:** React, TypeScript, Testing Library, Vitest.

---

## File Structure

- Modify: `frontend/src/screens/AddClothingScreen.test.tsx`
  - Add a focused save-error clearing test.
- Modify: `frontend/src/screens/AddClothingScreen.tsx`
  - Clear the save error whenever a draft field changes.

---

### Task 1: Save Error Clearing Test

**Files:**
- Modify: `frontend/src/screens/AddClothingScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Set `washmate.localWardrobe` to invalid JSON, switch to text mode, enter a clothing name, click save, and assert `"本地衣柜数据无法读取"` appears. Then edit the name and assert that message disappears.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- AddClothingScreen.test.tsx --run`

Expected: FAIL because `updateDraft` does not clear the existing save error.

---

### Task 2: Clear Error on Draft Edit

**Files:**
- Modify: `frontend/src/screens/AddClothingScreen.tsx`

- [ ] **Step 1: Clear save error in updateDraft**

Call `setError("")` when draft fields change.

- [ ] **Step 2: Run focused tests**

Run: `npm test -- AddClothingScreen.test.tsx --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run related tests**

Run: `npm test -- AddClothingScreen.test.tsx mobileSummary.test.ts --run`

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
git add docs/superpowers/plans/2026-05-30-add-clothing-clear-save-error.md frontend/src/screens/AddClothingScreen.tsx frontend/src/screens/AddClothingScreen.test.tsx
git commit -m "fix: clear add clothing save errors on edit"
```

Expected: local commit succeeds. Do not run `git push`.
