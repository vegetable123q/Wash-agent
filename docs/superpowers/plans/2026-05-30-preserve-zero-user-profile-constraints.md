# Preserve Zero User Profile Constraints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve explicit zero-valued laundry budget and maximum-wait preferences in the user profile, matching planner support for non-negative constraints.

**Architecture:** Change profile numeric preference parsing from positive-only to non-negative. Keep blank, negative, non-numeric, and non-finite values normalized to `null`.

**Tech Stack:** TypeScript, React Testing Library, Vitest, Vite build.

---

### Task 1: Preserve zero-valued user profile constraints

**Files:**
- Modify: `frontend/src/userProfile.test.ts`
- Modify: `frontend/src/screens/ProfileScreen.test.tsx`
- Modify: `frontend/src/userProfile.ts`
- Modify: `frontend/src/screens/ProfileScreen.tsx`

- [x] **Step 1: Write failing tests**

Add `userProfile` coverage:

```ts
it("preserves zero laundry preferences", () => {
  const saved = saveUserProfile({
    ...defaultUserProfile,
    budgetYuan: 0,
    maxWaitMinutes: 0,
  });

  expect(saved).toMatchObject({ budgetYuan: 0, maxWaitMinutes: 0 });
  expect(loadUserProfile()).toMatchObject({ budgetYuan: 0, maxWaitMinutes: 0 });
});
```

Update the existing invalid preference test to use negative values instead of `"0"` for invalid input.

Add `ProfileScreen` coverage:

```ts
it("saves zero budget and maximum wait preferences", () => {
  // render, enter "0" in both numeric fields, save, expect onSave with 0 values
});
```

- [x] **Step 2: Run tests to verify they fail**

Run from `frontend`: `npm test -- src/userProfile.test.ts src/screens/ProfileScreen.test.tsx`

Expected: FAIL because zero values are currently normalized to `null`.

- [x] **Step 3: Write minimal implementation**

In both `frontend/src/userProfile.ts` and `frontend/src/screens/ProfileScreen.tsx`, replace positive-only parsing with non-negative parsing:

```ts
return typeof numberValue === "number" && Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
```

Rename helper functions if it improves clarity.

- [x] **Step 4: Run target frontend tests**

Run from `frontend`: `npm test -- src/userProfile.test.ts src/screens/ProfileScreen.test.tsx`

Expected: PASS.

- [x] **Step 5: Run full frontend tests and build**

Run from `frontend`: `npm test`

Expected: PASS.

Run from `frontend`: `npm run build`

Expected: PASS.

- [x] **Step 6: Run diff whitespace check**

Run from repo root: `git diff --check`

Expected: exit code 0, ignoring existing CRLF warnings if present.

- [x] **Step 7: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-preserve-zero-user-profile-constraints.md frontend/src/userProfile.test.ts frontend/src/screens/ProfileScreen.test.tsx frontend/src/userProfile.ts frontend/src/screens/ProfileScreen.tsx
git commit -m "fix: preserve zero profile constraints"
```

Expected: one local commit. Do not push or upload.
