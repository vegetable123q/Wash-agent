# Today Screen Integer Wait Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the Today screen avoid fractional fastest-wait text such as `1.25 分`.

**Architecture:** Reuse the existing positive integer guard when filtering queue estimates for Today stats.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite, `npm`.

---

### Task 1: Guard Today screen wait display

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-today-screen-integer-wait.md`
- Modify: `frontend/src/screens/TodayScreen.test.tsx`
- Modify: `frontend/src/screens/TodayScreen.tsx`

- [x] **Step 1: Add failing fractional wait coverage**

In the existing invalid-number Today screen test, set:

```ts
estimated_wait_minutes: 1.25,
```

and assert:

```ts
expect(container.textContent).not.toContain("1.25");
```

Run from `frontend`:

```bash
npm test -- src/screens/TodayScreen.test.tsx
```

Expected: FAIL because the Today stats currently render fractional waits.

- [x] **Step 2: Implement integer-only wait filtering**

In `todayStats`, replace the queue estimate filter with:

```ts
.filter((q) => isPositiveFiniteInteger(q.estimated_wait_minutes))
```

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
git add docs/superpowers/plans/2026-05-30-today-screen-integer-wait.md frontend/src/screens/TodayScreen.test.tsx frontend/src/screens/TodayScreen.tsx
git commit -m "fix: guard today screen wait display"
```

Expected: one local commit. Do not push or upload.
