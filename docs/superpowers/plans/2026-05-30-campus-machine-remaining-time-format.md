# Campus Machine Remaining Time Format Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse CleverSchool remaining-time text when it appears as `剩余12分钟` instead of only `剩余时间:12分钟`.

**Architecture:** Keep the fix inside the existing `remainingMinutes` helper. Add a regression assertion to the campus machine API test suite using the transport seam.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add Remaining-Time Format Regression Coverage

**Files:**
- Modify: `frontend/src/api/campusMachineApi.test.ts`

- [ ] **Step 1: Write the failing test**

In the status synonym test, change the running machine status to:

```ts
status: "状态:使用中 剩余12分钟 更新时间:2026-05-29 13:20:00",
```

Keep this assertion:

```ts
expect(context.all_machines[1].remaining_minutes).toBe(12);
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- campusMachineApi.test.ts --run`

Expected: FAIL because `remainingMinutes` only matches `剩余时间`.

### Task 2: Relax Remaining-Time Regex

**Files:**
- Modify: `frontend/src/api/campusMachineApi.ts`

- [ ] **Step 1: Write minimal implementation**

Update `remainingMinutes`:

```ts
const match = statusText.match(/剩余(?:时间)?[:：]?\s*(\d+)\s*分钟/);
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- campusMachineApi.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-campus-machine-remaining-time-format.md`
- Modify: `frontend/src/api/campusMachineApi.ts`
- Modify: `frontend/src/api/campusMachineApi.test.ts`

- [ ] **Step 1: Run related checks**

Run: `npm test -- campusMachineApi.test.ts LaundryRoomScreen.test.tsx MachineDetailScreen.test.tsx --run`

Expected: PASS.

- [ ] **Step 2: Run full frontend checks**

Run: `npm test -- --run`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Inspect diff**

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 4: Commit locally without uploading**

```bash
git add docs/superpowers/plans/2026-05-30-campus-machine-remaining-time-format.md frontend/src/api/campusMachineApi.ts frontend/src/api/campusMachineApi.test.ts
git commit -m "fix: parse compact machine remaining time"
```
