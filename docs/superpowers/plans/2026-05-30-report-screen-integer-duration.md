# Report Screen Integer Duration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the report screen hide fractional `estimated_duration_minutes` values instead of rendering impossible machine-time copy such as `1.5 分钟`.

**Architecture:** Align the display guard with report generation: total duration must be a finite, non-negative integer before it is rendered.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite, `npm`.

---

### Task 1: Guard report screen duration display

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-report-screen-integer-duration.md`
- Modify: `frontend/src/screens/ReportScreen.test.tsx`
- Modify: `frontend/src/screens/ReportScreen.tsx`

- [x] **Step 1: Add failing screen coverage**

Update the existing invalid-number report screen test to set:

```ts
estimated_duration_minutes: 1.5,
```

and assert:

```ts
expect(container.textContent).not.toContain("1.5");
```

Run from `frontend`:

```bash
npm test -- src/screens/ReportScreen.test.tsx
```

Expected: FAIL because the screen currently accepts finite fractional durations.

- [x] **Step 2: Implement integer-only duration formatting**

Add an integer guard helper and use it in `formatDuration`:

```ts
function formatDuration(minutes: number | null | undefined): string {
  return isFiniteNonNegativeInteger(minutes) ? `${minutes} 分钟` : "待确认";
}
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
git add docs/superpowers/plans/2026-05-30-report-screen-integer-duration.md frontend/src/screens/ReportScreen.test.tsx frontend/src/screens/ReportScreen.tsx
git commit -m "fix: guard report screen duration display"
```

Expected: one local commit. Do not push or upload.
