# ModelHub Recognition Filter Care Scalars Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent non-string scalar care fields such as `true` from appearing in ModelHub recognition notes.

**Architecture:** Keep array and object recursion in `careTexts`, but ignore scalar values unless they are strings. This preserves textual care instructions while dropping booleans and numbers from LLM payloads.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Filter non-string care scalars

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-modelhub-recognition-filter-care-scalars.md`
- Modify: `frontend/src/api/modelHubRecognition.test.ts`
- Modify: `frontend/src/api/modelHubRecognition.ts`

- [x] **Step 1: Add failing care scalar coverage**

Add a test with:

```ts
care_warnings: [true, "do not tumble dry"]
```

Assert `result.note` does not contain `true`, while still preserving a non-empty care note.

Run from `frontend`:

```bash
npm test -- src/api/modelHubRecognition.test.ts
```

Expected: FAIL because `careTexts` currently stringifies non-string scalars.

- [x] **Step 2: Implement scalar filtering**

Change `careTexts` so after array/object handling:

```ts
if (typeof value !== "string") return [];
return value.split(...);
```

- [x] **Step 3: Run target and frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/modelHubRecognition.test.ts
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
git add docs/superpowers/plans/2026-05-30-modelhub-recognition-filter-care-scalars.md frontend/src/api/modelHubRecognition.test.ts frontend/src/api/modelHubRecognition.ts
git commit -m "fix: filter non-string modelhub care text"
```

Expected: one local commit. Do not push or upload.
