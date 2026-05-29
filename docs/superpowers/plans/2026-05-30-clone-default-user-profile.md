# Clone Default User Profile Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent callers from mutating the shared `defaultUserProfile` object returned by `loadUserProfile`.

**Architecture:** Keep `defaultUserProfile` as the exported constant. Return a shallow clone on default load paths because the profile shape is flat.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/userProfile.test.ts`
  - Add coverage proving mutating a loaded default profile does not mutate `defaultUserProfile`.
- Modify: `frontend/src/userProfile.ts`
  - Return `{ ...defaultUserProfile }` on default load paths.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/userProfile.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test:

```ts
  it("returns a copy of the default profile", () => {
    const loaded = loadUserProfile();

    loaded.displayName = "Mutated";

    expect(defaultUserProfile.displayName).toBe("");
    expect(loadUserProfile().displayName).toBe("");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- userProfile.test.ts --run`

Expected: FAIL because the current default path returns the shared object.

---

### Task 2: Return Default Profile Copies

**Files:**
- Modify: `frontend/src/userProfile.ts`
- Test: `frontend/src/userProfile.test.ts`

- [ ] **Step 1: Write minimal implementation**

Add:

```ts
function defaultProfile(): UserProfile {
  return { ...defaultUserProfile };
}
```

Replace default returns in `loadUserProfile` with `defaultProfile()`.

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- userProfile.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-clone-default-user-profile.md`
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
git add docs/superpowers/plans/2026-05-30-clone-default-user-profile.md frontend/src/userProfile.ts frontend/src/userProfile.test.ts
git commit -m "fix: clone default user profile"
```

Expected: a local-only commit. Do not push or upload.
