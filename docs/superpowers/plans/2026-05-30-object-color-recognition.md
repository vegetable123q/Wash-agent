# Object Color Recognition Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve recognized color values when ModelHub returns colors as an object instead of an array or string.

**Architecture:** Extend the existing `colorsText` helper only. It already centralizes color normalization, so object support should live there and reuse `translateColorName`.

**Tech Stack:** TypeScript, Vitest.

---

## File Structure

- Modify: `frontend/src/api/modelHubRecognition.test.ts`
  - Add a focused object-color payload test.
- Modify: `frontend/src/api/modelHubRecognition.ts`
  - Add recursive object handling to `colorsText`.

---

### Task 1: Object Colors Test

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Write the failing test**

Stub ModelHub with:

```ts
{
  is_clothing: true,
  name: "blue white tee",
  material_ratios: { cotton: 1 },
  colors: { primary: "blue", secondary: "white" },
}
```

Assert the result has `colors: "蓝色、白色"`.

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: FAIL because object colors currently normalize to an empty string.

---

### Task 2: Object Color Normalization

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.ts`

- [ ] **Step 1: Extend colorsText**

When the value is a non-null object, collect its values recursively through `colorsText`, split into translated color labels, and join them.

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
git add docs/superpowers/plans/2026-05-30-object-color-recognition.md frontend/src/api/modelHubRecognition.ts frontend/src/api/modelHubRecognition.test.ts
git commit -m "fix: normalize object color payloads"
```

Expected: local commit succeeds. Do not run `git push`.
