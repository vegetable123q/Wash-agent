# Mobile Summary Integer Wardrobe Counts Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent legacy fractional wardrobe wear/wash counts from being silently floored into valid-looking integers.

**Architecture:** Keep the fix in `mobileSummary.ts` normalization. Stored wardrobe count fields are accepted only when they are finite non-negative integers; invalid or fractional values normalize to `0`.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Require integer wardrobe counts in mobile summary

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-mobile-summary-integer-wardrobe-counts.md`
- Modify: `frontend/src/api/mobileSummary.test.ts`
- Modify: `frontend/src/api/mobileSummary.ts`

- [x] **Step 1: Add failing legacy count coverage**

Add a test that stores a legacy wardrobe item with:

```ts
wear_count_since_wash: 2.5,
wash_count: 1.5,
```

Assert `fetchMobileSummary()` normalizes both counts to `0`.

Run from `frontend`:

```bash
npm test -- src/api/mobileSummary.test.ts
```

Expected: FAIL because the current helper floors fractional values.

- [x] **Step 2: Implement integer count validation**

Change `nonNegativeInteger` from floor-based behavior to integer validation:

```ts
return typeof numeric === "number" && Number.isFinite(numeric) && Number.isInteger(numeric) && numeric >= 0
  ? numeric
  : 0;
```

- [x] **Step 3: Run target and frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/mobileSummary.test.ts
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
git add docs/superpowers/plans/2026-05-30-mobile-summary-integer-wardrobe-counts.md frontend/src/api/mobileSummary.test.ts frontend/src/api/mobileSummary.ts
git commit -m "fix: require integer wardrobe counts in summary"
```

Expected: one local commit. Do not push or upload.
