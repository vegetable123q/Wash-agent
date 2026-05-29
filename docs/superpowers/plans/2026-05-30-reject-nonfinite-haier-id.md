# Reject Non-Finite Haier ID Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent non-finite numeric Haier machine identifiers from entering the campus machine context.

**Architecture:** Keep validation in the `requiredIdentifier` helper used by Haier payload parsing. Add one regression test for a `NaN` numeric ID, then only accept nonempty strings or finite numbers.

**Tech Stack:** TypeScript, Vitest, campus machine API adapter.

---

### Task 1: Reject Non-Finite Numeric IDs

**Files:**
- Modify: `frontend/src/api/campusMachineApi.test.ts`
- Modify: `frontend/src/api/campusMachineApi.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `frontend/src/api/campusMachineApi.test.ts`:

```ts
it("rejects non-finite Haier numeric identifiers", async () => {
  const transport: CampusMachineTransport = async ({ url, data }) => {
    if (url.endsWith("/device/status")) {
      return { success: true, data: [] };
    }
    if (url.endsWith("/position/deviceDetailPage") && data?.categoryCode === "00") {
      return { code: 0, data: { items: [{ id: Number.NaN, name: "washer", state: 1 }] } };
    }
    return { code: 0, data: { items: [] } };
  };

  await expect(buildCampusContextForDorm("南区21号楼", { transport })).rejects.toThrow("Missing required haier[0].id");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- campusMachineApi.test.ts --run
```

Expected: FAIL because `Number.NaN` is currently converted to the string `"NaN"`.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/campusMachineApi.ts`, update `requiredIdentifier`:

```ts
if (typeof value === "string" && value.trim()) {
  return value.trim();
}
if (typeof value === "number" && Number.isFinite(value)) {
  return String(value);
}
throw new Error(`Missing required ${context}.${key}`);
```

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- campusMachineApi.test.ts --run
```

Expected: PASS for all campus machine API tests.

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
git add docs/superpowers/plans/2026-05-30-reject-nonfinite-haier-id.md frontend/src/api/campusMachineApi.test.ts frontend/src/api/campusMachineApi.ts
git commit -m "fix: reject nonfinite haier ids"
```

Expected: a local-only commit. Do not push or upload.
