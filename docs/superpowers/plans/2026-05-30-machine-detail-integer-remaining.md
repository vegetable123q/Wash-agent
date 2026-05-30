# Machine Detail Integer Remaining Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make machine detail display avoid fractional running remaining time such as `1.5 分钟`.

**Architecture:** Keep the guard local to `timingText`; running machines should show remaining minutes only when the value is a finite, non-negative integer.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite, `npm`.

---

### Task 1: Guard machine detail remaining time

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-machine-detail-integer-remaining.md`
- Modify: `frontend/src/screens/MachineDetailScreen.test.tsx`
- Modify: `frontend/src/screens/MachineDetailScreen.tsx`

- [x] **Step 1: Add failing fractional remaining-time coverage**

Parameterize the existing invalid remaining-time test so it covers both:

```ts
Number.POSITIVE_INFINITY
1.5
```

Assert the rendered text does not contain the raw invalid value.

Run from `frontend`:

```bash
npm test -- src/screens/MachineDetailScreen.test.tsx
```

Expected: FAIL for `1.5` because the screen currently renders fractional minutes.

- [x] **Step 2: Implement integer-only remaining-time formatting**

Add:

```ts
function isFiniteNonNegativeInteger(value: unknown): value is number {
  return isFiniteNonNegativeNumber(value) && Number.isInteger(value);
}
```

Use it in `timingText`.

- [x] **Step 3: Run target and full frontend verification**

Run from `frontend`:

```bash
npm test -- src/screens/MachineDetailScreen.test.tsx
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
git add docs/superpowers/plans/2026-05-30-machine-detail-integer-remaining.md frontend/src/screens/MachineDetailScreen.test.tsx frontend/src/screens/MachineDetailScreen.tsx
git commit -m "fix: guard machine detail remaining time"
```

Expected: one local commit. Do not push or upload.
