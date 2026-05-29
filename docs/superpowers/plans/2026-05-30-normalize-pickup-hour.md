# Normalize Pickup Hour Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve valid one-digit pickup hours such as `7:05` by normalizing them to `07:05`.

**Architecture:** Keep pickup-time cleanup inside the user profile normalization path. Add a regression test for stored legacy data, then introduce a tiny normalization helper used by `normalizeProfile` and keep `isValidPickupTime` aligned with the same accepted format.

**Tech Stack:** TypeScript, Vitest, localStorage-backed profile helper.

---

### Task 1: Normalize One-Digit Pickup Hours

**Files:**
- Modify: `frontend/src/userProfile.test.ts`
- Modify: `frontend/src/userProfile.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `frontend/src/userProfile.test.ts`:

```ts
it("normalizes one-digit pickup hours to HH:MM", () => {
  localStorage.setItem(
    storageKey,
    JSON.stringify({
      latestPickupTime: "7:05",
    }),
  );

  expect(loadUserProfile().latestPickupTime).toBe("07:05");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- userProfile.test.ts --run
```

Expected: FAIL because `7:05` currently falls back to the default pickup time.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/userProfile.ts`, replace the direct `latestPickupTime` validity check with a helper:

```ts
function normalizePickupTime(value: unknown): string {
  const text = String(value ?? defaultUserProfile.latestPickupTime).trim();
  const match = /^(\d{1,2}):(\d{2})$/.exec(text);
  if (!match) return defaultUserProfile.latestPickupTime;
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) return defaultUserProfile.latestPickupTime;
  return `${String(hour).padStart(2, "0")}:${match[2]}`;
}
```

Use it in `normalizeProfile`, and update `isValidPickupTime` to accept the same one- or two-digit hour format.

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- userProfile.test.ts --run
```

Expected: PASS for all profile tests.

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
git add docs/superpowers/plans/2026-05-30-normalize-pickup-hour.md frontend/src/userProfile.test.ts frontend/src/userProfile.ts
git commit -m "fix: normalize pickup hour"
```

Expected: a local-only commit. Do not push or upload.
