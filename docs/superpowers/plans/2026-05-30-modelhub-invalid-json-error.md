# ModelHub Invalid JSON Error Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw `JSON.parse` failures from ModelHub recognition output with an explicit application error.

**Architecture:** Keep parsing centralized in `parseGeminiJsonText`. Do not infer clothing data from invalid text; fail with a clear message that the recognition JSON was invalid.

**Tech Stack:** TypeScript, Vitest.

---

## File Structure

- Modify: `frontend/src/api/modelHubRecognition.test.ts`
  - Add a focused invalid recognition JSON test.
- Modify: `frontend/src/api/modelHubRecognition.ts`
  - Catch `JSON.parse` failures and throw `"ModelHub returned invalid recognition JSON"`.

---

### Task 1: Invalid JSON Recognition Test

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Write the failing test**

Stub ModelHub to return a candidate text of `"not json"` and assert:

```ts
await expect(recognizeClothingText("white cotton tee", modelHubConfig)).rejects.toThrow(
  "ModelHub returned invalid recognition JSON",
);
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: FAIL because the code currently exposes the raw parser error.

---

### Task 2: Explicit Invalid JSON Error

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.ts`

- [ ] **Step 1: Wrap JSON.parse**

Catch parse errors in `parseGeminiJsonText` and throw `"ModelHub returned invalid recognition JSON"`.

- [ ] **Step 2: Run focused tests**

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run related tests**

Run: `npm test -- modelHubRecognition.test.ts AddClothingScreen.test.tsx --run`

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
git add docs/superpowers/plans/2026-05-30-modelhub-invalid-json-error.md frontend/src/api/modelHubRecognition.ts frontend/src/api/modelHubRecognition.test.ts
git commit -m "fix: clarify invalid modelhub json errors"
```

Expected: local commit succeeds. Do not run `git push`.
