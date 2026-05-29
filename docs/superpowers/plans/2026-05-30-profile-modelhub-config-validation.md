# Profile ModelHub Config Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Show an explicit Profile screen error instead of saving malformed ModelHub recognition configuration.

**Architecture:** Keep validation in the ModelHub config form submit path. Reuse existing `normalizeModelHubConfig` and `hasCompleteModelHubConfig` helpers so the UI and recognition code share the same definition of usable configuration.

**Tech Stack:** React, TypeScript, Testing Library, Vitest.

---

## File Structure

- Modify: `frontend/src/screens/ProfileScreen.test.tsx`
  - Add a focused invalid ModelHub config submission test.
- Modify: `frontend/src/screens/ProfileScreen.tsx`
  - Add ModelHub config error state and block invalid saves.

---

### Task 1: Invalid ModelHub Config Submission Test

**Files:**
- Modify: `frontend/src/screens/ProfileScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Render `ProfileScreen`, change `ModelHub baseUrl` to `"not a url"`, change `apikey` to a non-empty value, submit the ModelHub form, and assert:

```ts
expect(onSaveModelHubConfig).not.toHaveBeenCalled();
expect(screen.getByText("请填写有效的 ModelHub baseUrl、apikey 和 model_name")).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- ProfileScreen.test.tsx --run`

Expected: FAIL because the form currently calls `onSaveModelHubConfig` even when the normalized config is incomplete.

---

### Task 2: Explicit Config Validation

**Files:**
- Modify: `frontend/src/screens/ProfileScreen.tsx`

- [ ] **Step 1: Add ModelHub error state**

Add `modelHubError` state near `modelHubSaved`.

- [ ] **Step 2: Validate normalized config before saving**

In `handleApiSubmit`, normalize the draft. If it is not complete, set the error, clear saved state, update the draft to the normalized value, and return without calling `onSaveModelHubConfig`.

- [ ] **Step 3: Clear error on config edits and clear action**

Clear `modelHubError` when the user edits baseUrl, apikey, or model_name, and when they clear the config.

- [ ] **Step 4: Render the error**

Render `modelHubError` with the existing `form-status form-status-error` style.

- [ ] **Step 5: Run focused tests**

Run: `npm test -- ProfileScreen.test.tsx --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run related tests**

Run: `npm test -- ProfileScreen.test.tsx modelHubConfig.test.ts --run`

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
git add docs/superpowers/plans/2026-05-30-profile-modelhub-config-validation.md frontend/src/screens/ProfileScreen.tsx frontend/src/screens/ProfileScreen.test.tsx
git commit -m "fix: validate modelhub config form"
```

Expected: local commit succeeds. Do not run `git push`.
