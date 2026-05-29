# Laundry Preference Constraints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Let users set per-laundry budget and maximum wait preferences, then pass those explicit constraints into the in-APK laundry planner.

**Architecture:** Keep the feature inside existing mobile boundaries. `UserProfile` owns persisted preferences, `ProfileScreen` edits them, and `mobileSummary` converts them into the existing `LaundryConstraints` fields already consumed by `laundryPlanner`.

**Tech Stack:** React 18, TypeScript, Vitest, Vite.

---

## File Structure

- Modify: `frontend/src/userProfile.ts`
  - Add nullable numeric `budgetYuan` and `maxWaitMinutes` fields.
  - Normalize missing, blank, invalid, zero, or negative values to `null`.
- Modify: `frontend/src/screens/ProfileScreen.tsx`
  - Add numeric inputs for budget and maximum wait in the existing washing preference form.
  - Keep controlled input behavior compatible with `null` profile values.
- Modify: `frontend/src/screens/ProfileScreen.test.tsx`
  - Verify the new fields save numeric values through `onSave`.
- Modify: `frontend/src/api/mobileSummary.ts`
  - Include `budgetYuan` and `maxWaitMinutes` when building `LaundryConstraints`.
  - Preserve existing behavior when values are `null`.
- Modify: `frontend/src/api/mobileSummary.test.ts`
  - Verify selected laundry plans surface budget and wait warnings when profile preferences are set.
- Create: `frontend/src/userProfile.test.ts`
  - Verify profile persistence and normalization for the new fields.

---

### Task 1: Profile Contract and Persistence

**Files:**
- Create: `frontend/src/userProfile.test.ts`
- Modify: `frontend/src/userProfile.ts`

- [ ] **Step 1: Write failing profile normalization tests**

Add tests that save/load `budgetYuan` and `maxWaitMinutes`, and normalize invalid values to `null`.

Run: `npm test -- userProfile.test.ts --run`

Expected: FAIL because the fields do not exist or are not normalized.

- [ ] **Step 2: Implement profile fields**

Add `budgetYuan: number | null` and `maxWaitMinutes: number | null` to `UserProfile`, `defaultUserProfile`, and `normalizeProfile`.

- [ ] **Step 3: Verify profile tests pass**

Run: `npm test -- userProfile.test.ts --run`

Expected: PASS.

---

### Task 2: Profile Screen Controls

**Files:**
- Modify: `frontend/src/screens/ProfileScreen.test.tsx`
- Modify: `frontend/src/screens/ProfileScreen.tsx`

- [ ] **Step 1: Write failing UI save test**

Extend the profile screen test to type a budget and max wait, submit the form, and assert `onSave` receives numeric values.

Run: `npm test -- ProfileScreen.test.tsx --run`

Expected: FAIL because the inputs are missing.

- [ ] **Step 2: Add controlled inputs**

Add `type="number"` fields with clear labels:
- `本次预算上限（元）`
- `最大等待时间（分钟）`

Use empty strings for `null` values and convert blank input back to `null`.

- [ ] **Step 3: Verify profile screen tests pass**

Run: `npm test -- ProfileScreen.test.tsx --run`

Expected: PASS.

---

### Task 3: Planner Constraint Wiring

**Files:**
- Modify: `frontend/src/api/mobileSummary.test.ts`
- Modify: `frontend/src/api/mobileSummary.ts`

- [ ] **Step 1: Write failing planner-wiring test**

Add a test that builds a selected laundry summary with available washer context, passes `{ allowDryer: false, budgetYuan: 3, maxWaitMinutes: 0 }`, and asserts the resulting `plan.global_warnings` includes over-budget and over-wait warnings.

Run: `npm test -- mobileSummary.test.ts --run`

Expected: FAIL because `mobileSummary` currently passes `null` budget and wait constraints.

- [ ] **Step 2: Pass profile constraints into `LaundryConstraints`**

Update `fetchMobileSummary`, `rebuildMobileSummaryForSelection`, `buildIntegratedMobileSummary`, and `buildLaundryArtifacts` profile types so `budget_yuan` and `max_wait_minutes` use profile values when provided.

- [ ] **Step 3: Verify mobile summary tests pass**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: PASS.

---

### Task 4: Final Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused frontend tests**

Run: `npm test -- userProfile.test.ts ProfileScreen.test.tsx mobileSummary.test.ts --run`

Expected: PASS.

- [ ] **Step 2: Run full frontend tests**

Run: `npm test -- --run`

Expected: PASS.

- [ ] **Step 3: Run frontend build**

Run: `npm run build`

Expected: PASS.

- [ ] **Step 4: Confirm no upload**

Run: `git status --short`

Expected: only local file changes before commit, no push performed.

- [ ] **Step 5: Create a local-only commit**

Run:

```powershell
git add docs/superpowers/plans/2026-05-30-laundry-preference-constraints.md frontend/src/userProfile.ts frontend/src/userProfile.test.ts frontend/src/screens/ProfileScreen.tsx frontend/src/screens/ProfileScreen.test.tsx frontend/src/api/mobileSummary.ts frontend/src/api/mobileSummary.test.ts
git commit -m "feat: add laundry preference constraints"
```

Expected: local commit succeeds. Do not run `git push`.
