# Recommended Start Integer Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `computeRecommendedStartTime` treat fractional plan durations as invalid and fall back to the standard 60-minute duration.

**Architecture:** Tighten the local `isValidDuration` guard so shared schedule logic accepts only finite, positive integer minutes.

**Tech Stack:** TypeScript, Vitest, Vite, `npm`.

---

### Task 1: Guard recommended start duration inputs

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-recommended-start-integer-duration.md`
- Modify: `frontend/src/api/llmSummary.test.ts`
- Modify: `frontend/src/api/llmSummary.ts`

- [x] **Step 1: Add failing duration coverage**

Extend the existing invalid-duration test:

```ts
expect(computeRecommendedStartTime(1.5, "22:30")).toBe("21:15");
```

Run from `frontend`:

```bash
npm test -- src/api/llmSummary.test.ts
```

Expected: FAIL because fractional durations currently influence the computed start time.

- [x] **Step 2: Implement integer-only duration validation**

Update `isValidDuration`:

```ts
function isValidDuration(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && Number.isInteger(value) && value > 0;
}
```

- [x] **Step 3: Run target and full frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/llmSummary.test.ts
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
git add docs/superpowers/plans/2026-05-30-recommended-start-integer-duration.md frontend/src/api/llmSummary.test.ts frontend/src/api/llmSummary.ts
git commit -m "fix: guard recommended start duration"
```

Expected: one local commit. Do not push or upload.
