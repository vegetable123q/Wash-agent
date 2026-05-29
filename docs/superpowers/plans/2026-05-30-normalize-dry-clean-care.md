# Normalize Dry Clean Care Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate common dry-clean prohibition care phrases into the existing Chinese editable note text.

**Architecture:** Keep the behavior in the recognition care display dictionary. Add a regression test through the public `recognizeClothingText` path, then add aliases for `do_not_dry_clean` and `no dry clean` after `termKey` normalization.

**Tech Stack:** TypeScript, Vitest, ModelHub recognition normalization.

---

### Task 1: Normalize Dry-Clean Prohibition Phrases

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`
- Modify: `frontend/src/api/modelHubRecognition.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `frontend/src/api/modelHubRecognition.test.ts`:

```ts
it("normalizes dry-clean prohibition care phrases", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      modelHubResponse({
        is_clothing: true,
        name: "linen jacket",
        material_ratios: { linen: 1 },
        colors: ["beige"],
        care_warnings: ["do_not_dry_clean", "no dry clean"],
      }),
    ),
  );

  const result = await recognizeClothingText("linen jacket care label says no dry clean", modelHubConfig);

  expect(result.note).toContain("不可干洗");
  expect(result.note).not.toContain("do_not_dry_clean");
  expect(result.note).not.toContain("no dry clean");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- modelHubRecognition.test.ts --run
```

Expected: FAIL because the dry-clean prohibition strings are currently preserved as raw English labels.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/modelHubRecognition.ts`, add these aliases near the dry-clean entries:

```ts
do_not_dry_clean: "不可干洗",
no_dry_clean: "不可干洗",
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
git add docs/superpowers/plans/2026-05-30-normalize-dry-clean-care.md frontend/src/api/modelHubRecognition.test.ts frontend/src/api/modelHubRecognition.ts
git commit -m "fix: normalize dry clean care phrases"
```

Expected: a local-only commit. Do not push or upload.
