# Frequency Advisor Integer Wear Count Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent fractional `wear_count_since_wash` values from being floored into valid-looking wash-frequency advice.

**Architecture:** Keep the fix local to `frequencyAdvisor.ts`. The advisor's count normalizer accepts only finite non-negative integers; invalid or fractional values become `0`.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Require integer wear counts in frequency advisor

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-frequency-advisor-integer-wear-count.md`
- Modify: `frontend/src/api/frequencyAdvisor.test.ts`
- Modify: `frontend/src/api/frequencyAdvisor.ts`

- [x] **Step 1: Add failing fractional wear-count coverage**

Add a test using:

```ts
adviseFrequency(planItem({ name: "white cotton tee", wearCount: 2.5 }), constraints)
```

Assert the priority score is `0`, because fractional counts should normalize to `0`.

Run from `frontend`:

```bash
npm test -- src/api/frequencyAdvisor.test.ts
```

Expected: FAIL because the current helper floors `2.5` to `2`.

- [x] **Step 2: Implement integer validation**

Change `nonNegativeInteger` to:

```ts
return Number.isFinite(value) && Number.isInteger(value) && value >= 0 ? value : 0;
```

- [x] **Step 3: Run target and frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/frequencyAdvisor.test.ts
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
git add docs/superpowers/plans/2026-05-30-frequency-advisor-integer-wear-count.md frontend/src/api/frequencyAdvisor.test.ts frontend/src/api/frequencyAdvisor.ts
git commit -m "fix: require integer wear counts in advisor"
```

Expected: one local commit. Do not push or upload.
