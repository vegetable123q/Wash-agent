# Recommended Time Validation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent invalid pickup times such as `25:99` from producing rolled-over next-day recommended start times.

**Architecture:** Keep validation inside `computeRecommendedStartTime`, the single helper used by the Today screen for start-time recommendations.

**Tech Stack:** TypeScript, Vitest.

---

## File Structure

- Create: `frontend/src/api/llmSummary.test.ts`
  - Add deterministic tests for valid pickup time, stale pickup time, and invalid out-of-range pickup time.
- Modify: `frontend/src/api/llmSummary.ts`
  - Validate pickup hour/minute ranges before using `Date.setHours`.

---

### Task 1: Recommended Time Tests

**Files:**
- Create: `frontend/src/api/llmSummary.test.ts`

- [ ] **Step 1: Write failing invalid-time test**

Use fake timers at `2026-05-29T19:00:00+08:00`. Assert `computeRecommendedStartTime(60, "25:99")` returns `19:15`, not a rolled-over next-day time.

Run: `npm test -- llmSummary.test.ts --run`

Expected: FAIL because invalid numeric ranges are currently accepted.

---

### Task 2: Time Range Validation

**Files:**
- Modify: `frontend/src/api/llmSummary.ts`

- [ ] **Step 1: Validate parsed time ranges**

Only use the pickup time when hour is `0..23` and minute is `0..59`; otherwise fall back to the existing `now + 15 minutes` suggestion.

- [ ] **Step 2: Verify llm summary tests pass**

Run: `npm test -- llmSummary.test.ts --run`

Expected: PASS.

---

### Task 3: Verification and Local Version

**Files:**
- Verify all changed files.

- [ ] **Step 1: Run focused tests**

Run: `npm test -- llmSummary.test.ts TodayScreen.test.tsx --run`

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
git add docs/superpowers/plans/2026-05-30-recommended-time-validation.md frontend/src/api/llmSummary.ts frontend/src/api/llmSummary.test.ts
git commit -m "fix: validate recommended pickup time"
```

Expected: local commit succeeds. Do not run `git push`.
