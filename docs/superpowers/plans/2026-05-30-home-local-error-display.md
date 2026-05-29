# Home Local Error Display Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show explicit local-data errors on the home screen when the initial mobile summary load fails.

**Architecture:** Keep error classification in `App.tsx`, because it owns summary loading and refresh state. Let `TodayScreen` render the supplied refresh error regardless of connection state so initial-load errors are visible.

**Tech Stack:** React, TypeScript, Testing Library, Vitest.

---

## File Structure

- Modify: `frontend/src/App.refresh.test.tsx`
  - Add an initial-load failure test for local storage corruption messages.
- Modify: `frontend/src/App.tsx`
  - Map known local-data errors to their explicit message and keep generic refresh copy for other failures.
- Modify: `frontend/src/screens/TodayScreen.tsx`
  - Render `refreshError` outside the connected-only weather section.

---

### Task 1: Initial Load Local Error Test

**Files:**
- Modify: `frontend/src/App.refresh.test.tsx`

- [ ] **Step 1: Write the failing test**

Mock `fetchMobileSummary` to reject with `new Error("本地衣柜数据无法读取")`, render `<App />`, and assert the message appears.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- App.refresh.test.tsx --run`

Expected: FAIL because initial load currently swallows the error and `TodayScreen` only shows refresh errors inside the connected weather section.

---

### Task 2: Error Mapping and Home Rendering

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/screens/TodayScreen.tsx`

- [ ] **Step 1: Add an error message helper in App**

Return the original message when it starts with `"本地"`; otherwise return `"刷新失败，请稍后重试"`.

- [ ] **Step 2: Use the helper in manual refresh catch**

Keep the current summary visible, but set `refreshState.error` to the mapped message.

- [ ] **Step 3: Use the helper in initial load catch**

When the initial load fails and the effect is still active, set backend status to offline and set `refreshState.error` to the mapped message.

- [ ] **Step 4: Render refreshError outside connected-only content**

Move the refresh error paragraph to a top-level position after the primary panel so it is visible when `connected` is false.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- App.refresh.test.tsx --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run related screen tests**

Run: `npm test -- App.refresh.test.tsx TodayScreen.test.tsx --run`

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
git add docs/superpowers/plans/2026-05-30-home-local-error-display.md frontend/src/App.tsx frontend/src/App.refresh.test.tsx frontend/src/screens/TodayScreen.tsx
git commit -m "fix: surface local data load errors"
```

Expected: local commit succeeds. Do not run `git push`.
