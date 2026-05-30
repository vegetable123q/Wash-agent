# Today Screen Integer Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Today screen hide fractional `estimated_duration_minutes` values instead of showing impossible user-facing copy such as `1.5 分钟`.

**Architecture:** Keep the guard local to Today screen display logic. Only positive integer durations should feed the summary copy and whole-plan completion label.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite, `npm`.

---

### Task 1: Guard Today screen duration display

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-today-screen-integer-duration.md`
- Modify: `frontend/src/screens/TodayScreen.test.tsx`
- Modify: `frontend/src/screens/TodayScreen.tsx`

- [x] **Step 1: Add failing dashboard coverage**

Update the existing invalid-number Today screen test to set:

```ts
mobileSummary.plan.estimated_duration_minutes = 1.5;
```

and assert:

```ts
expect(container.textContent).not.toContain("1.5");
```

Run from `frontend`:

```bash
npm test -- src/screens/TodayScreen.test.tsx
```

Expected: FAIL because Today currently accepts finite fractional durations.

- [x] **Step 2: Implement integer-only Today duration display**

Add a helper:

```ts
function isPositiveFiniteInteger(value: unknown): value is number {
  return isPositiveFiniteNumber(value) && Number.isInteger(value);
}
```

Use it for `planSummary.duration` and `recommendedLabel`.

- [x] **Step 3: Run target and full frontend verification**

Run from `frontend`:

```bash
npm test -- src/screens/TodayScreen.test.tsx
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
git add docs/superpowers/plans/2026-05-30-today-screen-integer-duration.md frontend/src/screens/TodayScreen.test.tsx frontend/src/screens/TodayScreen.tsx
git commit -m "fix: guard today screen duration display"
```

Expected: one local commit. Do not push or upload.
