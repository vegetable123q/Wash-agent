# Empty MIME Image Recognition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Allow ModelHub image recognition for common image files whose browser `File.type` is empty but whose filename has a clear image extension.

**Architecture:** Keep validation inside `recognizeClothingImage`. Resolve the MIME type from `file.type` first, then from known image extensions. Do not guess from file bytes or unknown extensions.

**Tech Stack:** TypeScript, Vitest.

---

## File Structure

- Modify: `frontend/src/api/modelHubRecognition.test.ts`
  - Add a focused empty-MIME `.jpg` test.
- Modify: `frontend/src/api/modelHubRecognition.ts`
  - Add a helper to resolve MIME types from known extensions.

---

### Task 1: Empty MIME JPG Test

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Write the failing test**

Create `new File(["abc"], "shirt.jpg", { type: "" })`, call `recognizeClothingImage`, and assert the outgoing request body contains `inline_data.mime_type: "image/jpeg"`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: FAIL because the code currently rejects files without an `image/*` MIME type.

---

### Task 2: Known Extension MIME Resolution

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.ts`

- [ ] **Step 1: Add a MIME resolver helper**

Return `file.type` when it starts with `image/`. Otherwise map known lowercase extensions:

- `.jpg`, `.jpeg` -> `image/jpeg`
- `.png` -> `image/png`
- `.webp` -> `image/webp`
- `.gif` -> `image/gif`
- `.heic` -> `image/heic`

- [ ] **Step 2: Use the resolved MIME**

Use the resolved MIME for both validation and `inline_data.mime_type`.

- [ ] **Step 3: Run focused tests**

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
git add docs/superpowers/plans/2026-05-30-empty-mime-image-recognition.md frontend/src/api/modelHubRecognition.ts frontend/src/api/modelHubRecognition.test.ts
git commit -m "fix: infer image mime from filename"
```

Expected: local commit succeeds. Do not run `git push`.
