# Bound Frequency Keywords Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent English keyword substring matches from inflating wash-frequency priority scores for unrelated words.

**Architecture:** `frequencyAdvisor` already has boundary-aware matching for threshold terms. Reuse the same boundary-aware behavior for `containsAny`, so English terms such as `sport` do not match inside unrelated words such as `transport`, while Chinese terms continue using substring matching.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Reproduce Substring False Positive

**Files:**
- Modify: `frontend/src/api/frequencyAdvisor.test.ts`

- [x] **Step 1: Add false-positive test**

Add a test showing that `transport jacket` should not receive a sport bonus from the `sport` substring:

```ts
it("does not match sport terms inside unrelated English words", () => {
  const advice = adviseFrequency(planItem({ name: "transport jacket", wearCount: 0 }), constraints);

  expect(advice.priority_score).toBe(0);
  expect(advice.reasons.join(" ")).not.toContain("运动");
});
```

- [x] **Step 2: Run the focused test and verify RED**

Run:

```bash
npm test -- frequencyAdvisor.test.ts --run
```

Expected: the new test fails because `transport` currently matches `sport`.

### Task 2: Use Boundary-Aware English Keyword Matching

**Files:**
- Modify: `frontend/src/api/frequencyAdvisor.ts`

- [x] **Step 1: Route containsAny through term matching**

Update `containsAny`:

```ts
function containsAny(text: string, terms: Set<string>): boolean {
  for (const term of terms) {
    if (termMatches(text, term)) return true;
  }
  return false;
}
```

- [x] **Step 2: Generalize the existing threshold matcher**

Rename `thresholdTermMatches` to `termMatches` and use it from both `thresholdFor` and `containsAny`:

```ts
function termMatches(text: string, term: string): boolean {
  if (/^[a-z0-9 -]+$/i.test(term)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(term);
}
```

- [x] **Step 3: Run the focused test and verify GREEN**

Run:

```bash
npm test -- frequencyAdvisor.test.ts --run
```

Expected: all `frequencyAdvisor` tests pass.

### Task 3: Verify and Commit Locally

**Files:**
- Verify: `frontend/src/api/frequencyAdvisor.ts`
- Verify: `frontend/src/api/frequencyAdvisor.test.ts`

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
git add docs/superpowers/plans/2026-05-30-bound-frequency-keywords.md frontend/src/api/frequencyAdvisor.ts frontend/src/api/frequencyAdvisor.test.ts
git commit -m "fix: bound frequency keyword matches"
```

Expected: local commit is created. Do not push or upload.
