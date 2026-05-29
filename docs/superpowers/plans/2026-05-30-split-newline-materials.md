# Split Newline Materials Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse ModelHub material strings that list composition entries on separate lines.

**Architecture:** Keep the fix in the material string normalization helper. Add a regression test around `recognizeClothingText`, then include newline characters in the existing material split expression.

**Tech Stack:** TypeScript, Vitest, ModelHub recognition adapter.

---

### Task 1: Split Newline-Separated Material Strings

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`
- Modify: `frontend/src/api/modelHubRecognition.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the existing material string tests in `frontend/src/api/modelHubRecognition.test.ts`:

```ts
it("splits newline-separated material ratio strings", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      modelHubResponse({
        is_clothing: true,
        name: "cotton polyester hoodie",
        material: "cotton 80%\npolyester 20%",
        colors: ["gray"],
      }),
    ),
  );

  const result = await recognizeClothingText("cotton polyester hoodie", modelHubConfig);

  expect(result.material).toBe("棉 80%、聚酯纤维 20%");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- modelHubRecognition.test.ts --run
```

Expected: FAIL because the current material splitter does not split on newlines.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/modelHubRecognition.ts`, update `materialStringText` split regex to include line breaks:

```ts
.split(/[、，,;；\n]+/)
```

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- modelHubRecognition.test.ts --run
```

Expected: PASS for all recognition tests.

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
git add docs/superpowers/plans/2026-05-30-split-newline-materials.md frontend/src/api/modelHubRecognition.test.ts frontend/src/api/modelHubRecognition.ts
git commit -m "fix: split newline material ratios"
```

Expected: a local-only commit. Do not push or upload.
