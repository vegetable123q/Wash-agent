# Normalize Stored Pickup Time Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent invalid legacy `latestPickupTime` values from being loaded into the profile form and planner preferences.

**Architecture:** Move pickup-time validation into `frontend/src/userProfile.ts` so persisted profile normalization and the profile form share one rule. Keep the fallback conservative: invalid or missing stored values become `defaultUserProfile.latestPickupTime`.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest, React Testing Library.

---

### Task 1: Add Stored Pickup Time Regression Coverage

**Files:**
- Modify: `frontend/src/userProfile.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test to `describe("userProfile", ...)`:

```ts
  it("normalizes invalid stored pickup time to the default", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        latestPickupTime: "99:99",
      }),
    );

    expect(loadUserProfile().latestPickupTime).toBe(defaultUserProfile.latestPickupTime);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- userProfile.test.ts --run`

Expected: FAIL because `loadUserProfile().latestPickupTime` is currently `"99:99"`.

### Task 2: Share Pickup Time Validation

**Files:**
- Modify: `frontend/src/userProfile.ts`
- Modify: `frontend/src/screens/ProfileScreen.tsx`

- [ ] **Step 1: Write minimal implementation**

In `frontend/src/userProfile.ts`, change `normalizeProfile` so `latestPickupTime` uses a validated helper:

```ts
const latestPickupTime = String(profile.latestPickupTime ?? defaultUserProfile.latestPickupTime).trim();
```

and return:

```ts
latestPickupTime: isValidPickupTime(latestPickupTime) ? latestPickupTime : defaultUserProfile.latestPickupTime,
```

Add and export:

```ts
export function isValidPickupTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}
```

In `frontend/src/screens/ProfileScreen.tsx`, import `isValidPickupTime` from `../userProfile` and remove the local duplicate helper.

- [ ] **Step 2: Run focused tests**

Run: `npm test -- userProfile.test.ts ProfileScreen.test.tsx --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-normalize-stored-pickup-time.md`
- Modify: `frontend/src/userProfile.ts`
- Modify: `frontend/src/userProfile.test.ts`
- Modify: `frontend/src/screens/ProfileScreen.tsx`

- [ ] **Step 1: Run full frontend checks**

Run: `npm test -- --run`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 2: Inspect diff**

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 3: Commit locally without uploading**

```bash
git add docs/superpowers/plans/2026-05-30-normalize-stored-pickup-time.md frontend/src/userProfile.ts frontend/src/userProfile.test.ts frontend/src/screens/ProfileScreen.tsx
git commit -m "fix: normalize stored pickup time"
```
