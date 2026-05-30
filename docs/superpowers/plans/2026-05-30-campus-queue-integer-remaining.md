# Campus Queue Integer Remaining Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make campus queue estimates ignore invalid fractional running-machine remaining times instead of propagating them as waits.

**Architecture:** Keep the guard in `buildQueueEstimates`, the aggregation point shared by all campus machine sources.

**Tech Stack:** TypeScript, Vitest, Vite, `npm`.

---

### Task 1: Guard queue estimate remaining minutes

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-campus-queue-integer-remaining.md`
- Modify: `frontend/src/api/campusMachineApi.test.ts`
- Modify: `frontend/src/api/campusMachineApi.ts`

- [x] **Step 1: Add failing queue estimate coverage**

Import `buildQueueEstimates` and add a test with a running machine:

```ts
remaining_minutes: 1.5,
```

Assert:

```ts
expect(estimates[0].estimated_wait_minutes).toBeNull();
```

Run from `frontend`:

```bash
npm test -- src/api/campusMachineApi.test.ts
```

Expected: FAIL because queue estimates currently propagate the fractional wait.

- [x] **Step 2: Implement integer-only remaining-minute filtering**

In `buildQueueEstimates`, include running machine remaining times only when they are finite, non-negative integers.

- [x] **Step 3: Run target and full frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/campusMachineApi.test.ts
npm test
npm run build
```

Run from repo root:

```bash
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 4: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-campus-queue-integer-remaining.md frontend/src/api/campusMachineApi.test.ts frontend/src/api/campusMachineApi.ts
git commit -m "fix: guard campus queue remaining time"
```

Expected: one local commit. Do not push or upload.
