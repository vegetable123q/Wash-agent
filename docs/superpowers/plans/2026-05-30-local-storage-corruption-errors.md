# Local Storage Corruption Errors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace raw localStorage JSON/shape failures with explicit application errors without silently clearing or defaulting user data.

**Architecture:** Keep storage validation inside the existing `mobileSummary` local storage helpers. Both wardrobe records and selected laundry records should fail loudly with user-understandable messages when their stored JSON is malformed or not an array.

**Tech Stack:** TypeScript, Vitest.

---

## File Structure

- Modify: `frontend/src/api/mobileSummary.test.ts`
  - Add a focused test for corrupted wardrobe localStorage.
- Modify: `frontend/src/api/mobileSummary.ts`
  - Add a small JSON-array storage reader used by wardrobe and dirty-basket readers.

---

### Task 1: Corrupted Wardrobe Storage Test

**Files:**
- Modify: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Write the failing test**

Set `washmate.localWardrobe` to invalid JSON and assert:

```ts
await expect(fetchMobileSummary()).rejects.toThrow("本地衣柜数据无法读取");
```

- [ ] **Step 2: Run the focused test to verify it fails**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: FAIL because the code currently throws a raw `SyntaxError` message.

---

### Task 2: Explicit Storage Parse Errors

**Files:**
- Modify: `frontend/src/api/mobileSummary.ts`

- [ ] **Step 1: Add a shared storage array reader**

Create a helper that reads a localStorage key, returns `[]` when absent, parses JSON in a `try/catch`, verifies the parsed value is an array, and throws the supplied message if parsing or validation fails.

- [ ] **Step 2: Use the helper for wardrobe items**

Update `readLocalWardrobeItems` to call the helper with `"本地衣柜数据无法读取"`.

- [ ] **Step 3: Use the helper for dirty-basket records**

Update `readDirtyBasketRecords` to call the helper with `"本地脏衣篮选择无法读取"`.

- [ ] **Step 4: Run focused tests**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run related API tests**

Run: `npm test -- mobileSummary.test.ts laundryPlanner.test.ts --run`

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
git add docs/superpowers/plans/2026-05-30-local-storage-corruption-errors.md frontend/src/api/mobileSummary.ts frontend/src/api/mobileSummary.test.ts
git commit -m "fix: clarify corrupted local storage errors"
```

Expected: local commit succeeds. Do not run `git push`.
