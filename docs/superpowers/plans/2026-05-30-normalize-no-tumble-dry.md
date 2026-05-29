# Normalize No Tumble Dry Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate the common `no tumble dry` care phrase into the existing Chinese editable note text.

**Architecture:** Keep the change inside the recognition display-term dictionary. Add a regression test through `recognizeClothingText`, then add one `careDisplayNames` alias because `termKey("no tumble dry")` already normalizes the phrase to `no_tumble_dry`.

**Tech Stack:** TypeScript, Vitest, ModelHub recognition normalization.

---

### Task 1: Normalize No Tumble Dry Care Phrase

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`
- Modify: `frontend/src/api/modelHubRecognition.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `frontend/src/api/modelHubRecognition.test.ts`:

```ts
it("normalizes spaced no-tumble-dry care phrases", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      modelHubResponse({
        is_clothing: true,
        name: "wool cardigan",
        material_ratios: { wool: 1 },
        colors: ["beige"],
        care_warnings: ["no tumble dry"],
      }),
    ),
  );

  const result = await recognizeClothingText("wool cardigan care label says no tumble dry", modelHubConfig);

  expect(result.note).toContain("不可烘干");
  expect(result.note).not.toContain("no tumble dry");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- modelHubRecognition.test.ts --run
```

Expected: FAIL because `no tumble dry` is currently preserved as English text.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/modelHubRecognition.ts`, add this alias near `do_not_tumble_dry`:

```ts
no_tumble_dry: "不可烘干",
```

- [ ] **Step 4: Run focused test to verify it passes**

Run:

```bash
npm test -- modelHubRecognition.test.ts --run
```

Expected: PASS for all ModelHub recognition tests.

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
git add docs/superpowers/plans/2026-05-30-normalize-no-tumble-dry.md frontend/src/api/modelHubRecognition.test.ts frontend/src/api/modelHubRecognition.ts
git commit -m "fix: normalize no tumble dry phrase"
```

Expected: a local-only commit. Do not push or upload.
