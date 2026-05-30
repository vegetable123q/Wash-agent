# Require Frontend Machine Modes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frontend laundry planning select only machines whose `modes` explicitly include the required program, matching backend planner behavior.

**Architecture:** Keep machine matching local to `findAvailableMachine()`. Change empty `modes` from permissive to non-match.

**Tech Stack:** TypeScript, Vitest, Vite, `npm`.

---

### Task 1: Require explicit machine mode support in frontend planner

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-require-frontend-machine-modes.md`
- Modify: `frontend/src/api/laundryPlanner.test.ts`
- Modify: `frontend/src/api/laundryPlanner.ts`

- [x] **Step 1: Add failing frontend test**

Add near machine availability tests:

```ts
it("requires machines to explicitly support the selected wash program", () => {
  const noModeContext: CampusContext = {
    ...context,
    available_machines: [{ ...standardWasher, modes: [] }],
  };

  expect(() => planLaundry([standardItem("tee-1", "white tee")], {
    selected_item_ids: ["tee-1"],
    urgent_item_ids: [],
    allow_mixed_colors: false,
    allow_dryer: false,
    hygiene_sensitive: true,
    max_wait_minutes: 10,
    budget_yuan: null,
  }, noModeContext)).toThrow("no available machine for standard_washer program standard");
});
```

Run from `frontend`: `npm test -- src/api/laundryPlanner.test.ts`

Expected: FAIL because frontend currently treats empty `modes` as compatible with any program.

- [x] **Step 2: Implement strict mode matching**

In `findAvailableMachine()`:

```ts
(m) => m.machine_type === machineType && m.status === "available" && m.modes.includes(program)
```

- [x] **Step 3: Run target and full frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/laundryPlanner.test.ts
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
git add docs/superpowers/plans/2026-05-30-require-frontend-machine-modes.md frontend/src/api/laundryPlanner.test.ts frontend/src/api/laundryPlanner.ts
git commit -m "fix: require frontend machine modes"
```

Expected: one local commit. Do not push or upload.
