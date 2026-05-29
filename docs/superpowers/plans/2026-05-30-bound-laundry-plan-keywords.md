# Bound Laundry Plan Keywords Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent laundry bucket planning from matching English keywords inside unrelated words.

**Architecture:** `laundryPlanner` uses `containsAny` across color, bedding, material, and care terms. Add the same boundary-aware English term matching used in frequency advice so terms such as `sheet` do not match inside `worksheet`, while Chinese terms continue using substring matching.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Reproduce Bedding False Positive

**Files:**
- Modify: `frontend/src/api/laundryPlanner.test.ts`

- [x] **Step 1: Add false-positive test**

Add a test showing that `worksheet tee` should not be classified as bedding just because it contains `sheet`:

```ts
it("does not match bedding terms inside unrelated English words", () => {
  const item = standardItem("tee-1", "worksheet tee");
  const plan = planLaundry([item], {
    selected_item_ids: ["tee-1"],
    urgent_item_ids: [],
    allow_mixed_colors: false,
    allow_dryer: false,
    hygiene_sensitive: true,
    max_wait_minutes: 10,
    budget_yuan: null,
  }, context);

  expect(plan.buckets[0].bucket_id).toBe("light-standard");
  expect(plan.buckets[0].program).toBe("standard");
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- laundryPlanner.test.ts --run
```

Expected: the new test fails because `worksheet` currently matches `sheet` and gets planned as `large-bedding`.

### Task 2: Use Boundary-Aware English Keyword Matching

**Files:**
- Modify: `frontend/src/api/laundryPlanner.ts`

- [x] **Step 1: Update containsAny**

Route `containsAny` through a new `termMatches` helper:

```ts
function containsAny(text: string, terms: Set<string>): boolean {
  for (const term of terms) {
    if (termMatches(text, term)) return true;
  }
  return false;
}
```

- [x] **Step 2: Add boundary-aware helper**

Add helper functions near `containsAny`:

```ts
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

- [x] **Step 3: Run the focused test and verify GREEN**

Run:

```bash
npm test -- laundryPlanner.test.ts --run
```

Expected: all `laundryPlanner` tests pass.

### Task 3: Verify and Commit Locally

**Files:**
- Verify: `frontend/src/api/laundryPlanner.ts`
- Verify: `frontend/src/api/laundryPlanner.test.ts`

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
git add docs/superpowers/plans/2026-05-30-bound-laundry-plan-keywords.md frontend/src/api/laundryPlanner.ts frontend/src/api/laundryPlanner.test.ts
git commit -m "fix: bound laundry plan keyword matches"
```

Expected: local commit is created. Do not push or upload.
