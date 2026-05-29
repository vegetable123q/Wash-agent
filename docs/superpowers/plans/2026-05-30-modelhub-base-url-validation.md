# ModelHub Base URL Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent malformed ModelHub baseUrl values from being treated as complete recognition configuration.

**Architecture:** Keep normalization unchanged and add validation to `hasCompleteModelHubConfig`, the single helper screens and recognition code use to decide whether credentials are usable.

**Tech Stack:** TypeScript, Vitest.

---

## File Structure

- Modify: `frontend/src/api/modelHubConfig.test.ts`
  - Add a focused invalid-baseUrl test.
- Modify: `frontend/src/api/modelHubConfig.ts`
  - Require baseUrl to parse as an `http:` or `https:` URL.

---

### Task 1: Invalid Base URL Test

**Files:**
- Modify: `frontend/src/api/modelHubConfig.test.ts`

- [ ] **Step 1: Write the failing test**

Import `hasCompleteModelHubConfig` and assert a config with `baseUrl: "not a url"`, a non-empty apikey, and the supported model returns `false`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- modelHubConfig.test.ts --run`

Expected: FAIL because the helper currently only checks that baseUrl is non-empty.

---

### Task 2: HTTP(S) Base URL Validation

**Files:**
- Modify: `frontend/src/api/modelHubConfig.ts`

- [ ] **Step 1: Add a URL validator helper**

Parse the baseUrl with `new URL(value)` and accept only `http:` or `https:`.

- [ ] **Step 2: Use it in hasCompleteModelHubConfig**

Require the URL helper, non-empty apikey, and supported model name.

- [ ] **Step 3: Run focused tests**

Run: `npm test -- modelHubConfig.test.ts --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run related API tests**

Run: `npm test -- modelHubConfig.test.ts modelHubRecognition.test.ts --run`

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
git add docs/superpowers/plans/2026-05-30-modelhub-base-url-validation.md frontend/src/api/modelHubConfig.ts frontend/src/api/modelHubConfig.test.ts
git commit -m "fix: validate modelhub base url"
```

Expected: local commit succeeds. Do not run `git push`.
