# Parse Hour Machine Remaining Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse machine status strings that report remaining time in hours and minutes.

**Architecture:** Keep the existing CleverSchool status normalization flow. Extend only the `remainingMinutes` helper so minute-only strings keep working and hour-plus-minute strings return total minutes.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/api/campusMachineApi.test.ts`
  - Add coverage for a CleverSchool running status containing `1小时20分钟`.
- Modify: `frontend/src/api/campusMachineApi.ts`
  - Extend remaining-time parsing to support an optional hour component before minutes.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/api/campusMachineApi.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test inside `describe("campusMachineApi", ...)`:

```ts
  it("parses hour and minute remaining time", async () => {
    const transport: CampusMachineTransport = async ({ url }) => {
      if (url.endsWith("/device/status")) {
        return {
          success: true,
          data: [
            {
              tower: "南区21号楼",
              macUnionCode: "洗衣机 455515",
              floorName: "一层",
              status: "状态: 工作中 剩余1小时20分钟 更新时间:2026-05-29 13:20:00",
            },
          ],
        };
      }
      return { code: 0, data: { items: [] } };
    };

    const context = await buildCampusContextForDorm("南区21号楼", { transport });

    expect(context.all_machines[0].remaining_minutes).toBe(80);
    expect(context.queue_estimates[0].estimated_wait_minutes).toBe(80);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- campusMachineApi.test.ts --run`

Expected: FAIL because the current parser returns `null` for `剩余1小时20分钟`.

---

### Task 2: Parse Hour Plus Minute Durations

**Files:**
- Modify: `frontend/src/api/campusMachineApi.ts`
- Test: `frontend/src/api/campusMachineApi.test.ts`

- [ ] **Step 1: Write minimal implementation**

Replace the current `remainingMinutes` body with:

```ts
function remainingMinutes(statusText: string): number | null {
  const hourMinuteMatch = statusText.match(/剩余(?:时间)?[:：]?\s*(?:(\d+)\s*小时)?\s*(?:(\d+)\s*分钟)?/);
  if (hourMinuteMatch?.[1] || hourMinuteMatch?.[2]) {
    const hours = hourMinuteMatch[1] ? Number(hourMinuteMatch[1]) : 0;
    const minutes = hourMinuteMatch[2] ? Number(hourMinuteMatch[2]) : 0;
    return hours * 60 + minutes;
  }
  return null;
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- campusMachineApi.test.ts --run`

Expected: PASS, including existing minute-only cases.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-parse-hour-machine-remaining-time.md`
- Modify: `frontend/src/api/campusMachineApi.ts`
- Modify: `frontend/src/api/campusMachineApi.test.ts`

- [ ] **Step 1: Run full frontend tests**

Run: `npm test -- --run`

Expected: PASS with all frontend test files green.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS with TypeScript and Vite build completing successfully.

- [ ] **Step 3: Check whitespace**

Run: `git diff --check`

Expected: exit code 0.

- [ ] **Step 4: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-parse-hour-machine-remaining-time.md frontend/src/api/campusMachineApi.ts frontend/src/api/campusMachineApi.test.ts
git commit -m "fix: parse hour machine remaining time"
```

Expected: a local-only commit. Do not push or upload.
