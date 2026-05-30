# Profile Max Wait Integer Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep maximum wait preferences as non-negative integer minutes while preserving decimal laundry budgets.

**Architecture:** Split budget parsing from max-wait parsing in both the profile form and persisted profile normalization. Budget uses non-negative finite numbers; max wait uses non-negative finite integers.

**Tech Stack:** TypeScript, React, Vitest, Testing Library.

---

### Task 1: Enforce integer maximum wait preferences

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-profile-max-wait-integer.md`
- Modify: `frontend/src/screens/ProfileScreen.test.tsx`
- Modify: `frontend/src/screens/ProfileScreen.tsx`
- Modify: `frontend/src/userProfile.test.ts`
- Modify: `frontend/src/userProfile.ts`

- [x] **Step 1: Add failing preference coverage**

Add tests that:

```ts
// ProfileScreen
budget input = "12.5"
max wait input = "8.5"
expect(onSave).toHaveBeenCalledWith(expect.objectContaining({ budgetYuan: 12.5, maxWaitMinutes: null }))

// userProfile
localStorage maxWaitMinutes = "8.5"
expect(loadUserProfile().maxWaitMinutes).toBeNull()
```

Run from `frontend`:

```bash
npm test -- src/screens/ProfileScreen.test.tsx src/userProfile.test.ts
```

Expected: FAIL because max wait currently accepts fractional values.

- [x] **Step 2: Implement integer max-wait parsing**

Add a `nonNegativeIntegerOrNull` helper in both files or route field parsing through a shared local choice:

```ts
return typeof numberValue === "number" && Number.isFinite(numberValue) && Number.isInteger(numberValue) && numberValue >= 0
  ? numberValue
  : null;
```

Use that helper only for `maxWaitMinutes`; keep `budgetYuan` on non-negative number parsing.

- [x] **Step 3: Run target and frontend verification**

Run from `frontend`:

```bash
npm test -- src/screens/ProfileScreen.test.tsx src/userProfile.test.ts
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
git add docs/superpowers/plans/2026-05-30-profile-max-wait-integer.md frontend/src/screens/ProfileScreen.test.tsx frontend/src/screens/ProfileScreen.tsx frontend/src/userProfile.test.ts frontend/src/userProfile.ts
git commit -m "fix: require integer max wait preferences"
```

Expected: one local commit. Do not push or upload.
