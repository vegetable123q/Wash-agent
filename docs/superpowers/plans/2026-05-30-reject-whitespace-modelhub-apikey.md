# Reject Whitespace ModelHub API Key Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent whitespace-only ModelHub API keys from being treated as a complete config.

**Architecture:** Keep the fix in `hasCompleteModelHubConfig`, which gates all ModelHub calls. Add a regression test for a whitespace key, then require `apikey.trim()` to be nonempty.

**Tech Stack:** TypeScript, Vitest, ModelHub config helper.

---

### Task 1: Reject Whitespace API Keys

**Files:**
- Modify: `frontend/src/api/modelHubConfig.test.ts`
- Modify: `frontend/src/api/modelHubConfig.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `frontend/src/api/modelHubConfig.test.ts`:

```ts
it("does not treat whitespace-only apikey values as complete config", () => {
  expect(
    hasCompleteModelHubConfig({
      baseUrl: "https://modelhub.ailemac.com/v1beta",
      apikey: "   ",
      model_name: "gemini-3.1-pro-preview",
    }),
  ).toBe(false);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- modelHubConfig.test.ts --run
```

Expected: FAIL because a whitespace string is currently truthy.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/modelHubConfig.ts`, update `hasCompleteModelHubConfig`:

```ts
return Boolean(
  hasHttpModelHubBaseUrl(config.baseUrl)
  && config.apikey.trim()
  && supportedModelNames.includes(config.model_name as SupportedModelName)
);
```

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- modelHubConfig.test.ts --run
```

Expected: PASS for all ModelHub config tests.

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
git add docs/superpowers/plans/2026-05-30-reject-whitespace-modelhub-apikey.md frontend/src/api/modelHubConfig.test.ts frontend/src/api/modelHubConfig.ts
git commit -m "fix: reject whitespace modelhub apikey"
```

Expected: a local-only commit. Do not push or upload.
