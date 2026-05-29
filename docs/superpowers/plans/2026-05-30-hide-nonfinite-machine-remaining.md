# Hide Non-Finite Machine Remaining Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent non-finite live machine remaining times from appearing in the machine detail screen.

**Architecture:** Keep the fix in the `timingText` display helper. Add a regression test for a running backend machine with `remaining_minutes: Number.POSITIVE_INFINITY`, then only render the countdown for finite nonnegative numbers.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

---

### Task 1: Hide Non-Finite Remaining Time

**Files:**
- Modify: `frontend/src/screens/MachineDetailScreen.test.tsx`
- Modify: `frontend/src/screens/MachineDetailScreen.tsx`

- [ ] **Step 1: Write the failing test**

Add a test in `frontend/src/screens/MachineDetailScreen.test.tsx` that renders a running live backend machine with `remaining_minutes: Number.POSITIVE_INFINITY`. Assert that the screen text does not contain `Infinity` and the timing summary falls back to `运行中`.

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- MachineDetailScreen.test.tsx --run
```

Expected: FAIL because the current timing text renders `Infinity`.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/screens/MachineDetailScreen.tsx`, add a finite nonnegative number helper and use it in `timingText` before rendering `剩余 X 分钟`.

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- MachineDetailScreen.test.tsx --run
```

Expected: PASS for all machine detail tests.

- [ ] **Step 5: Run full verification**

Run:

```bash
npm test -- --run
npm run build
git diff --check
```

Expected: all tests pass, build succeeds, and diff check exits cleanly.

- [ ] **Step 6: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-hide-nonfinite-machine-remaining.md frontend/src/screens/MachineDetailScreen.test.tsx frontend/src/screens/MachineDetailScreen.tsx
git commit -m "fix: hide nonfinite machine remaining time"
```

Expected: a local-only commit. Do not push or upload.
