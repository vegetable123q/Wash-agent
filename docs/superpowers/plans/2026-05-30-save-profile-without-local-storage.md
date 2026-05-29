# Save Profile Without Local Storage Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `saveUserProfile` safe in environments where `localStorage` is unavailable.

**Architecture:** Keep profile normalization as the primary behavior. Only skip the persistence side effect when `localStorage` is missing, matching the defensive behavior already used by `loadUserProfile`.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/userProfile.test.ts`
  - Add coverage for saving with `localStorage` stubbed out.
- Modify: `frontend/src/userProfile.ts`
  - Guard the `localStorage.setItem` call.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/userProfile.test.ts`

- [ ] **Step 1: Write the failing test**

Update imports:

```ts
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
```

Add:

```ts
  afterEach(() => {
    vi.unstubAllGlobals();
  });
```

Add this test:

```ts
  it("returns a normalized profile when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);

    const saved = saveUserProfile({
      ...defaultUserProfile,
      displayName: " Test User ",
      latestPickupTime: "99:99",
    });

    expect(saved).toMatchObject({
      displayName: "Test User",
      latestPickupTime: defaultUserProfile.latestPickupTime,
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- userProfile.test.ts --run`

Expected: FAIL because `saveUserProfile` calls `localStorage.setItem` unconditionally.

---

### Task 2: Guard Missing localStorage On Save

**Files:**
- Modify: `frontend/src/userProfile.ts`
- Test: `frontend/src/userProfile.test.ts`

- [ ] **Step 1: Write minimal implementation**

Change `saveUserProfile` to:

```ts
export function saveUserProfile(profile: UserProfile): UserProfile {
  const normalized = normalizeProfile(profile);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- userProfile.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-save-profile-without-local-storage.md`
- Modify: `frontend/src/userProfile.ts`
- Modify: `frontend/src/userProfile.test.ts`

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
git add docs/superpowers/plans/2026-05-30-save-profile-without-local-storage.md frontend/src/userProfile.ts frontend/src/userProfile.test.ts
git commit -m "fix: save profile without local storage"
```

Expected: a local-only commit. Do not push or upload.
