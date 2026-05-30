# Report Screen Integer Wait Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the report screen environment overview avoid fractional queue wait text such as `1.25 分钟`.

**Architecture:** Reuse the existing integer guard in `ReportScreen` when filtering queue estimates for the fastest wait metric.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite, `npm`.

---

### Task 1: Guard report screen wait display

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-report-screen-integer-wait.md`
- Modify: `frontend/src/screens/ReportScreen.test.tsx`
- Modify: `frontend/src/screens/ReportScreen.tsx`

- [x] **Step 1: Add failing fractional wait coverage**

In the existing invalid-number report screen test, set:

```ts
estimated_wait_minutes: 1.25,
```

and assert:

```ts
expect(container.textContent).not.toContain("1.25");
```

Run from `frontend`:

```bash
npm test -- src/screens/ReportScreen.test.tsx
```

Expected: FAIL because the environment overview currently renders fractional waits.

- [x] **Step 2: Implement integer-only wait filtering**

In `environmentOverview`, replace the queue filter with the existing integer guard:

```ts
.filter(isFiniteNonNegativeInteger)
```

- [x] **Step 3: Run target and full frontend verification**

Run from `frontend`:

```bash
npm test -- src/screens/ReportScreen.test.tsx
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
git add docs/superpowers/plans/2026-05-30-report-screen-integer-wait.md frontend/src/screens/ReportScreen.test.tsx frontend/src/screens/ReportScreen.tsx
git commit -m "fix: guard report screen wait display"
```

Expected: one local commit. Do not push or upload.
