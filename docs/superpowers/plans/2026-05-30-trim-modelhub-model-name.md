# Trim ModelHub Model Name Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve supported ModelHub model names when saved or loaded with harmless surrounding whitespace.

**Architecture:** Keep the fix in `normalizeModelHubConfig`. Add a regression test for a whitespace-padded `model_name`, then trim the raw model name before checking the supported model list.

**Tech Stack:** TypeScript, Vitest, ModelHub config persistence helper.

---

### Task 1: Trim ModelHub Model Name

**Files:**
- Modify: `frontend/src/api/modelHubConfig.test.ts`
- Modify: `frontend/src/api/modelHubConfig.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `frontend/src/api/modelHubConfig.test.ts`:

```ts
it("trims supported model names before validation", () => {
  const saved = saveModelHubConfig({
    baseUrl: "https://modelhub.ailemac.com/v1beta",
    apikey: "sk-local-test-key",
    model_name: " gemini-3.1-pro-preview ",
  });

  expect(saved.model_name).toBe("gemini-3.1-pro-preview");
  expect(hasCompleteModelHubConfig(saved)).toBe(true);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- modelHubConfig.test.ts --run
```

Expected: FAIL because the current implementation validates before trimming.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/modelHubConfig.ts`, update `normalizeModelHubConfig`:

```ts
const modelName = String(config.model_name ?? "").trim();
...
model_name: supportedModelNames.includes(modelName as SupportedModelName) ? modelName : "",
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
git add docs/superpowers/plans/2026-05-30-trim-modelhub-model-name.md frontend/src/api/modelHubConfig.test.ts frontend/src/api/modelHubConfig.ts
git commit -m "fix: trim modelhub model name"
```

Expected: a local-only commit. Do not push or upload.
