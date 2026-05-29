# Dryer Unavailable Air-Dry Fallback Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep laundry planning usable when the user allows dryer use but no dryer is currently available.

**Architecture:** Change only `dryingDecision` in `laundryPlanner.ts`: if safe items could use a dryer but no matching dryer machine is available, return `air_dry` with a warning instead of throwing. Keep hard failures for missing washer availability and missing pricing rules.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add Dryer Fallback Regression Coverage

**Files:**
- Modify: `frontend/src/api/laundryPlanner.test.ts`

- [ ] **Step 1: Write the failing test**

Add:

```ts
  it("falls back to air dry when dryer is allowed but no dryer is available", () => {
    const item = standardItem("tee-1", "白色棉 T 恤");
    const plan = planLaundry([item], {
      selected_item_ids: ["tee-1"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: true,
      hygiene_sensitive: true,
      max_wait_minutes: 10,
      budget_yuan: null,
    }, context);

    expect(plan.buckets[0]).toMatchObject({
      dry_method: "air_dry",
    });
    expect(plan.global_warnings.some((warning) => warning.includes("没有可用烘干机"))).toBe(true);
  });
```

Add a small `standardItem` helper if needed.

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- laundryPlanner.test.ts --run`

Expected: FAIL because `dryingDecision` throws `no available machine for dryer program low`.

### Task 2: Return Air-Dry When Dryer Is Unavailable

**Files:**
- Modify: `frontend/src/api/laundryPlanner.ts`

- [ ] **Step 1: Write minimal implementation**

Add `findAvailableMachine` and reuse it in `requireAvailableMachine`:

```ts
function findAvailableMachine(
  available: MachineInfo[],
  machineType: MachineType,
  program: string,
): MachineInfo | null {
  return available.find(
    (m) => m.machine_type === machineType && m.status === "available" && (!m.modes.length || m.modes.includes(program)),
  ) ?? null;
}
```

In `dryingDecision`, replace direct dryer `requireAvailableMachine` with:

```ts
  const dryer = findAvailableMachine(context.available_machines, "dryer", "low");
  if (!dryer) {
    return ["air_dry", ["当前没有可用烘干机，改为自然晾干。", ...airDryContextWarnings(context)]];
  }
  requireDryerProgram(context, "low");
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- laundryPlanner.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-dryer-unavailable-air-dry-fallback.md`
- Modify: `frontend/src/api/laundryPlanner.ts`
- Modify: `frontend/src/api/laundryPlanner.test.ts`

- [ ] **Step 1: Run related checks**

Run: `npm test -- laundryPlanner.test.ts mobileSummary.test.ts PlanDetailScreen.test.tsx --run`

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
git add docs/superpowers/plans/2026-05-30-dryer-unavailable-air-dry-fallback.md frontend/src/api/laundryPlanner.ts frontend/src/api/laundryPlanner.test.ts
git commit -m "fix: fall back when dryer unavailable"
```
