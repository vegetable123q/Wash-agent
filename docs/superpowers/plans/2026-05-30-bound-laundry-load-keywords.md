# Bound Laundry Load Keywords Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent English laundry load keywords from matching inside unrelated longer words.

**Architecture:** Keep the existing load estimator and table-driven keyword rules. Change only the keyword matching helper so ASCII terms require non-alphanumeric boundaries, while non-ASCII terms keep the current substring behavior for compact Chinese-like labels.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/api/laundryLoad.test.ts`
  - Add a regression test showing unrelated English words such as `worksheet`, `dressage`, `downstream`, and `socket` should not be classified as large laundry-load items.
- Modify: `frontend/src/api/laundryLoad.ts`
  - Replace bare `String.includes` for ASCII terms with a boundary-aware helper and add a small regex escape helper.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/api/laundryLoad.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test inside the existing `describe("laundryLoad", ...)` block:

```ts
  it("does not match load terms inside unrelated English words", () => {
    expect(estimateLaundryLoadUnits({ name: "worksheet tee" })).toBe(12);
    expect(estimateLaundryLoadUnits({ name: "dressage tee" })).toBe(12);
    expect(estimateLaundryLoadUnits({ name: "downstream tee" })).toBe(12);
    expect(estimateLaundryLoadUnits({ name: "socket tee" })).toBe(12);
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- laundryLoad.test.ts --run`

Expected: FAIL because `worksheet tee` currently matches `sheet` and returns `65` instead of `12`.

---

### Task 2: Bound ASCII Keyword Matching

**Files:**
- Modify: `frontend/src/api/laundryLoad.ts`
- Test: `frontend/src/api/laundryLoad.test.ts`

- [ ] **Step 1: Write minimal implementation**

Replace the existing `containsAny` helper with:

```ts
function containsAny(text: string, terms: string[]): boolean {
  return terms.some((term) => termMatches(text, term.toLowerCase()));
}

function termMatches(text: string, term: string): boolean {
  if (/^[a-z0-9 _-]+$/i.test(term)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(term);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- laundryLoad.test.ts --run`

Expected: PASS, including the new regression test and the existing dress load test.

---

### Task 3: Verify and Commit

**Files:**
- Modify: `frontend/src/api/laundryLoad.ts`
- Modify: `frontend/src/api/laundryLoad.test.ts`
- Create: `docs/superpowers/plans/2026-05-30-bound-laundry-load-keywords.md`

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
git add docs/superpowers/plans/2026-05-30-bound-laundry-load-keywords.md frontend/src/api/laundryLoad.ts frontend/src/api/laundryLoad.test.ts
git commit -m "fix: bound laundry load keyword matches"
```

Expected: a local-only commit. Do not push or upload.
