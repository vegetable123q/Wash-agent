# Normalize String Dryer Preference Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Interpret stored string dryer preferences explicitly so `"false"` does not become `true`.

**Architecture:** Keep user profile normalization centralized. Replace the broad `Boolean(...)` conversion with a small helper that accepts real booleans and common true strings only.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/userProfile.test.ts`
  - Add coverage for legacy `allowDryer: "false"` storage.
- Modify: `frontend/src/userProfile.ts`
  - Add explicit boolean normalization for `allowDryer`.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/userProfile.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test:

```ts
  it("normalizes string false dryer preference to false", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        allowDryer: "false",
      }),
    );

    expect(loadUserProfile().allowDryer).toBe(false);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- userProfile.test.ts --run`

Expected: FAIL because `Boolean("false")` currently returns `true`.

---

### Task 2: Add Explicit Boolean Normalization

**Files:**
- Modify: `frontend/src/userProfile.ts`
- Test: `frontend/src/userProfile.test.ts`

- [ ] **Step 1: Write minimal implementation**

Change:

```ts
allowDryer: Boolean(profile.allowDryer),
```

to:

```ts
allowDryer: booleanValue(profile.allowDryer),
```

Add:

```ts
function booleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }
  return false;
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- userProfile.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-normalize-string-dryer-preference.md`
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
git add docs/superpowers/plans/2026-05-30-normalize-string-dryer-preference.md frontend/src/userProfile.ts frontend/src/userProfile.test.ts
git commit -m "fix: normalize string dryer preference"
```

Expected: a local-only commit. Do not push or upload.
