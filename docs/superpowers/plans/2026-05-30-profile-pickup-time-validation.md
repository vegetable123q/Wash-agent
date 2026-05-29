# Profile Pickup Time Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the profile form from saving an empty or malformed latest pickup time.

**Architecture:** Keep validation in the profile form submit path so invalid user input is explicit and no hidden fallback/default substitution is added.

**Tech Stack:** React, TypeScript, Testing Library, Vitest.

---

## File Structure

- Modify: `frontend/src/screens/ProfileScreen.test.tsx`
  - Add a focused form submission test that clears the time input and verifies save is blocked.
- Modify: `frontend/src/screens/ProfileScreen.tsx`
  - Add a small pickup time validator and a visible form error state.

---

### Task 1: Invalid Pickup Time Form Test

**Files:**
- Modify: `frontend/src/screens/ProfileScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Add a test that renders `ProfileScreen`, clears `input[type="time"]`, clicks the personal info save button, and asserts:

```ts
expect(onSave).not.toHaveBeenCalled();
expect(screen.getByText("请填写有效的最晚取衣时间")).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- ProfileScreen.test.tsx --run`

Expected: FAIL because the form currently calls `onSave` with an empty pickup time and does not show a validation error.

---

### Task 2: Explicit Pickup Time Validation

**Files:**
- Modify: `frontend/src/screens/ProfileScreen.tsx`

- [ ] **Step 1: Add form error state**

Add `profileError` state near the existing `saved` state. Clear it when profile fields change.

- [ ] **Step 2: Validate before saving**

In `handleSubmit`, validate `draft.latestPickupTime` against `HH:MM` with hour `0..23` and minute `0..59`. If invalid, set `"请填写有效的最晚取衣时间"`, set `saved` to `false`, and return without calling `onSave`.

- [ ] **Step 3: Render the validation error**

Render the error in the profile form status area with the existing red form status class.

- [ ] **Step 4: Run the focused test to verify it passes**

Run: `npm test -- ProfileScreen.test.tsx --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused screen tests**

Run: `npm test -- ProfileScreen.test.tsx TodayScreen.test.tsx --run`

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
git add docs/superpowers/plans/2026-05-30-profile-pickup-time-validation.md frontend/src/screens/ProfileScreen.tsx frontend/src/screens/ProfileScreen.test.tsx
git commit -m "fix: validate profile pickup time"
```

Expected: local commit succeeds. Do not run `git push`.
