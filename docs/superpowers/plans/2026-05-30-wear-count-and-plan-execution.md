# Wear Count And Plan Execution Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users manually edit wardrobe wear counts, keep clothing-detail controls aligned, and complete a laundry plan so selected dirty-basket items are cleared and their counts are updated.

**Architecture:** Keep state mutations in `frontend/src/api/mobileSummary.ts`, then wire them through `App.tsx` into the detail and plan screens. UI changes stay local to existing screens with focused CSS classes rather than changing global button behavior.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, localStorage-backed mobile summary state.

---

### Task 1: Add State Mutation Coverage

**Files:**
- Modify: `frontend/src/api/mobileSummary.test.ts`
- Modify: `frontend/src/api/mobileSummary.ts`

- [ ] **Step 1: Write failing tests**

Add tests proving `setWardrobeWearCount("tee-1", 5)` stores the exact count, rejects invalid counts, and `completeLaundryPlan()` clears selected dirty-basket ids while resetting selected items' `wear_count_since_wash` to `0` and incrementing `wash_count`.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/api/mobileSummary.test.ts`

Expected: fail because the new exported functions do not exist yet.

- [ ] **Step 3: Implement minimal API functions**

Add exported functions in `mobileSummary.ts`:
- `setWardrobeWearCount(itemId: string, wearCount: number)`
- `completeLaundryPlan()`

Both should reuse existing local wardrobe and dirty-basket helpers.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- src/api/mobileSummary.test.ts`

Expected: pass.

### Task 2: Add Detail Editing UI

**Files:**
- Modify: `frontend/src/screens/ClothingDetailScreen.test.tsx`
- Modify: `frontend/src/screens/ClothingDetailScreen.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Write failing UI test**

Add a test that changes the manual wear-count input and submits it, expecting `onSetWearCount(itemId, count)`.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/screens/ClothingDetailScreen.test.tsx`

Expected: fail because the input and prop do not exist.

- [ ] **Step 3: Implement detail UI and alignment**

Add a controlled numeric input for wear count, keep the existing one-click "记录穿着" action, and give the two action buttons a fixed two-column detail layout.

- [ ] **Step 4: Run tests to verify pass**

Run: `npm test -- src/screens/ClothingDetailScreen.test.tsx`

Expected: pass.

### Task 3: Add Execute Plan Flow

**Files:**
- Modify: `frontend/src/screens/PlanDetailScreen.test.tsx`
- Modify: `frontend/src/screens/PlanDetailScreen.tsx`
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Write failing UI test**

Add a test that renders a valid live plan, clicks "按此方案执行", and expects the supplied callback to run.

- [ ] **Step 2: Run tests to verify failure**

Run: `npm test -- src/screens/PlanDetailScreen.test.tsx`

Expected: fail because the button and prop do not exist.

- [ ] **Step 3: Wire the behavior through App**

Import the new summary API functions, add handlers for manual wear-count setting and plan completion, and pass them to the relevant screens.

- [ ] **Step 4: Run focused and full verification**

Run:
- `npm test -- src/api/mobileSummary.test.ts src/screens/ClothingDetailScreen.test.tsx src/screens/PlanDetailScreen.test.tsx`
- `npm test`
- `npm run build`

Expected: all pass.
