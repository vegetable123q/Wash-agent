# String Percent Material Ratios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Preserve ModelHub material percentages when the API returns ratio values as strings such as `"80%"`.

**Architecture:** Keep normalization inside `frontend/src/api/modelHubRecognition.ts` so API consumers continue receiving editable display strings. Add a regression test in the existing recognition test suite, then extract a tiny numeric-ratio helper used by `materialWithRatioText`.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add String Percent Ratio Coverage

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test in `describe("ModelHub clothing recognition", ...)`, near the other material normalization tests:

```ts
  it("normalizes string percent material ratios", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "cotton polyester hoodie",
          material_ratios: { cotton: "80%", polyester: "20%" },
          colors: ["gray"],
        }),
      ),
    );

    const result = await recognizeClothingText("cotton polyester hoodie", modelHubConfig);

    expect(result.material).toBe("棉 80%、聚酯纤维 20%");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: FAIL because `materialWithRatioText` currently calls `Number("80%")`, so the result is `棉、聚酯纤维`.

### Task 2: Parse Percent Strings in Material Ratio Values

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.ts`

- [ ] **Step 1: Write minimal implementation**

Add a helper near `materialWithRatioText`:

```ts
function numericRatioValue(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (trimmed.endsWith("%")) {
      return Number(trimmed.slice(0, -1));
    }
    return Number(trimmed);
  }
  return Number(value);
}
```

Then replace:

```ts
const numericRatio = typeof ratio === "number" ? ratio : Number(ratio);
```

with:

```ts
const numericRatio = numericRatioValue(ratio);
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`
- Modify: `frontend/src/api/modelHubRecognition.ts`
- Create: `docs/superpowers/plans/2026-05-30-string-percent-material-ratios.md`

- [ ] **Step 1: Run related checks**

Run: `npm test -- modelHubRecognition.test.ts AddClothingScreen.test.tsx --run`

Expected: PASS.

- [ ] **Step 2: Run full frontend checks**

Run: `npm test -- --run`

Expected: PASS.

Run: `npm run build`

Expected: PASS.

- [ ] **Step 3: Inspect diff**

Run: `git diff --check`

Expected: no output and exit code 0.

- [ ] **Step 4: Commit locally without uploading**

```bash
git add docs/superpowers/plans/2026-05-30-string-percent-material-ratios.md frontend/src/api/modelHubRecognition.ts frontend/src/api/modelHubRecognition.test.ts
git commit -m "fix: parse percent string material ratios"
```
