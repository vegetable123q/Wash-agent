# Laundry Room Integer Wait Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the laundry room queue cards avoid fractional wait text such as `18.5 分钟`.

**Architecture:** Add a small local wait formatter in `LaundryRoomScreen`; queue waits render only when they are finite, non-negative integers.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite, `npm`.

---

### Task 1: Guard laundry room queue wait display

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-laundry-room-integer-wait.md`
- Modify: `frontend/src/screens/LaundryRoomScreen.test.tsx`
- Modify: `frontend/src/screens/LaundryRoomScreen.tsx`

- [x] **Step 1: Add failing fractional queue wait coverage**

In the live backend machine context test, set one queue estimate to:

```ts
estimated_wait_minutes: 18.5,
```

and assert:

```ts
expect(container.textContent).not.toContain("18.5");
```

Run from `frontend`:

```bash
npm test -- src/screens/LaundryRoomScreen.test.tsx
```

Expected: FAIL because the queue cards currently render fractional waits.

- [x] **Step 2: Implement integer-only queue wait formatting**

Add:

```ts
function queueWaitText(minutes: number | null): string {
  return isFiniteNonNegativeInteger(minutes) ? `${minutes} 分钟` : "未知";
}
```

and use it in `queueFromBackend`.

- [x] **Step 3: Run target and full frontend verification**

Run from `frontend`:

```bash
npm test -- src/screens/LaundryRoomScreen.test.tsx
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
git add docs/superpowers/plans/2026-05-30-laundry-room-integer-wait.md frontend/src/screens/LaundryRoomScreen.test.tsx frontend/src/screens/LaundryRoomScreen.tsx
git commit -m "fix: guard laundry room queue wait"
```

Expected: one local commit. Do not push or upload.
