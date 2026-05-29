# Parse Usable Machine Status Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Classify `可使用` machine statuses as available without misclassifying `不可使用` as running.

**Architecture:** Keep the existing status-token helper. Add the explicit unavailable token before available/running checks, then add `可使用` to the available branch so the broader `使用` running token no longer wins.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/api/campusMachineApi.test.ts`
  - Add coverage for CleverSchool status strings `可使用` and `不可使用`.
- Modify: `frontend/src/api/campusMachineApi.ts`
  - Extend `machineStatus` token checks.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/api/campusMachineApi.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test inside `describe("campusMachineApi", ...)`:

```ts
  it("classifies usable and unavailable status text explicitly", async () => {
    const transport: CampusMachineTransport = async ({ url }) => {
      if (url.endsWith("/device/status")) {
        return {
          success: true,
          data: [
            {
              tower: "南区21号楼",
              macUnionCode: "洗衣机 455514",
              floorName: "一层",
              status: "状态: 可使用 更新时间:2026-05-29 13:20:00",
            },
            {
              tower: "南区21号楼",
              macUnionCode: "洗衣机 455515",
              floorName: "一层",
              status: "状态: 不可使用 更新时间:2026-05-29 13:20:00",
            },
          ],
        };
      }
      return { code: 0, data: { items: [] } };
    };

    const context = await buildCampusContextForDorm("南区21号楼", { transport });

    expect(context.all_machines.map((machine) => machine.status)).toEqual(["available", "out_of_service"]);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- campusMachineApi.test.ts --run`

Expected: FAIL because the current parser sees `使用` and classifies both statuses as running.

---

### Task 2: Extend Machine Status Tokens

**Files:**
- Modify: `frontend/src/api/campusMachineApi.ts`
- Test: `frontend/src/api/campusMachineApi.test.ts`

- [ ] **Step 1: Write minimal implementation**

Update `machineStatus`:

```ts
if (["脱水", "开盖", "出错", "错误", "异常", "故障", "不可使用", "停用"].some((token) => statusText.includes(token))) {
  return "out_of_service";
}
if (statusText.includes("待机") || statusText.includes("空闲") || statusText.includes("可用") || statusText.includes("可使用")) return "available";
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- campusMachineApi.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-parse-usable-machine-status.md`
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
git add docs/superpowers/plans/2026-05-30-parse-usable-machine-status.md frontend/src/api/campusMachineApi.ts frontend/src/api/campusMachineApi.test.ts
git commit -m "fix: parse usable machine status"
```

Expected: a local-only commit. Do not push or upload.
