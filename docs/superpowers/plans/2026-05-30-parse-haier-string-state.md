# Parse Haier String State Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Treat Haier machine state values returned as numeric strings the same as numeric state values.

**Architecture:** `haierMachineStatus` is the single conversion point for Haier state payloads. Normalize numeric strings to numbers there, keeping the rest of the machine context pipeline unchanged.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Reproduce String State Misclassification

**Files:**
- Modify: `frontend/src/api/campusMachineApi.test.ts`

- [x] **Step 1: Add string-state test**

Add a test showing that Haier string states are parsed as normal machine statuses:

```ts
it("parses Haier numeric state strings", async () => {
  const transport: CampusMachineTransport = async ({ url, data }) => {
    if (url.endsWith("/device/status")) {
      return { success: true, data: [] };
    }
    if (url.endsWith("/position/deviceDetailPage") && data?.categoryCode === "00") {
      return { code: 0, data: { items: [{ id: "h-1", name: "washer", state: "1" }] } };
    }
    return { code: 0, data: { items: [] } };
  };

  const context = await buildCampusContextForDorm("南区21号楼", { transport });

  expect(context.all_machines[0]).toMatchObject({
    machine_id: "h-1",
    status: "available",
  });
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- campusMachineApi.test.ts --run
```

Expected: the new test fails because string `"1"` currently maps to `unknown`.

### Task 2: Normalize Haier State Values

**Files:**
- Modify: `frontend/src/api/campusMachineApi.ts`

- [x] **Step 1: Parse numeric strings in haierMachineStatus**

Update `haierMachineStatus`:

```ts
function haierMachineStatus(state: unknown): MachineStatus {
  const stateCode =
    typeof state === "number" ? state : typeof state === "string" && state.trim() ? Number(state.trim()) : NaN;
  if (stateCode === 1) return "available";
  if (stateCode === 2) return "running";
  if (stateCode === 3) return "out_of_service";
  return "unknown";
}
```

- [x] **Step 2: Run the focused test and verify GREEN**

Run:

```bash
npm test -- campusMachineApi.test.ts --run
```

Expected: all campus machine API tests pass.

### Task 3: Verify and Commit Locally

**Files:**
- Verify: `frontend/src/api/campusMachineApi.ts`
- Verify: `frontend/src/api/campusMachineApi.test.ts`

- [x] **Step 1: Run complete frontend tests**

Run:

```bash
npm test -- --run
```

Expected: all frontend test files pass.

- [x] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: Vite build exits with code 0.

- [x] **Step 3: Check whitespace**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [x] **Step 4: Commit locally without pushing**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-parse-haier-string-state.md frontend/src/api/campusMachineApi.ts frontend/src/api/campusMachineApi.test.ts
git commit -m "fix: parse haier string state"
```

Expected: local commit is created. Do not push or upload.
