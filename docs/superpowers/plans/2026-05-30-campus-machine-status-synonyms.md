# Campus Machine Status Synonyms Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Recognize common CleverSchool machine status text variants such as `空闲` and `使用中` instead of treating them as `unknown`.

**Architecture:** Keep parsing in `campusMachineApi.ts` where provider payloads are normalized. Add one regression test that uses the existing transport seam and asserts machine status plus queue estimates.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add Status Synonym Regression Coverage

**Files:**
- Modify: `frontend/src/api/campusMachineApi.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test:

```ts
  it("recognizes common CleverSchool status synonyms", async () => {
    const transport: CampusMachineTransport = async ({ url }) => {
      if (url.endsWith("/device/status")) {
        return {
          success: true,
          data: [
            {
              tower: "南区21号楼",
              macUnionCode: "洗衣机 455514",
              floorName: "一层",
              status: "状态:空闲 更新时间:2026-05-29 13:20:00",
            },
            {
              tower: "南区21号楼",
              macUnionCode: "洗衣机 455515",
              floorName: "一层",
              status: "状态:使用中 剩余时间:12分钟 更新时间:2026-05-29 13:20:00",
            },
          ],
        };
      }
      return { code: 0, data: { items: [] } };
    };

    const context = await buildCampusContextForDorm("南区21号楼", { transport });

    expect(context.all_machines.map((machine) => machine.status)).toEqual(["available", "running"]);
    expect(context.all_machines[1].remaining_minutes).toBe(12);
    expect(context.queue_estimates[0]).toMatchObject({
      available_count: 1,
      running_count: 1,
      estimated_wait_minutes: 0,
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- campusMachineApi.test.ts --run`

Expected: FAIL because `空闲` and `使用中` are currently parsed as `unknown`.

### Task 2: Parse Additional Status Terms

**Files:**
- Modify: `frontend/src/api/campusMachineApi.ts`

- [ ] **Step 1: Write minimal implementation**

Update `machineStatus`:

```ts
  if (statusText.includes("待机") || statusText.includes("空闲") || statusText.includes("可用")) return "available";
  if (statusText.includes("工作") || statusText.includes("运转") || statusText.includes("使用") || statusText.includes("运行")) return "running";
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- campusMachineApi.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-campus-machine-status-synonyms.md`
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
git add docs/superpowers/plans/2026-05-30-campus-machine-status-synonyms.md frontend/src/api/campusMachineApi.ts frontend/src/api/campusMachineApi.test.ts
git commit -m "fix: recognize machine status synonyms"
```
