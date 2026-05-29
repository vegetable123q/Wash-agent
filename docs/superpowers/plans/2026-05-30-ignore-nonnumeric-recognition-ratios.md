# Ignore Nonnumeric Recognition Ratios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent loose ModelHub material ratio values such as `true` from being displayed as confident 100% material content.

**Architecture:** Keep the fix in the recognition payload normalization layer. Add a focused regression test around `recognizeClothingText`, then tighten `numericRatioValue` to accept only numbers and numeric strings.

**Tech Stack:** TypeScript, Vitest, ModelHub recognition adapter.

---

### Task 1: Ignore Nonnumeric Recognition Ratios

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`
- Modify: `frontend/src/api/modelHubRecognition.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the existing material ratio tests in `frontend/src/api/modelHubRecognition.test.ts`:

```ts
it("does not treat nonnumeric material ratios as 100 percent", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      modelHubResponse({
        is_clothing: true,
        name: "cotton wool sweater",
        material_ratios: { cotton: true, wool: "50%" },
        colors: ["beige"],
      }),
    ),
  );

  const result = await recognizeClothingText("cotton wool sweater", modelHubConfig);

  expect(result.material).not.toContain("100%");
  expect(result.material).toContain("50%");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- modelHubRecognition.test.ts --run
```

Expected: FAIL because the current parser uses `Number(true)` and displays cotton as 100%.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/modelHubRecognition.ts`, update `numericRatioValue`:

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
  return Number.NaN;
}
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
git add docs/superpowers/plans/2026-05-30-ignore-nonnumeric-recognition-ratios.md frontend/src/api/modelHubRecognition.test.ts frontend/src/api/modelHubRecognition.ts
git commit -m "fix: ignore nonnumeric recognition ratios"
```

Expected: a local-only commit. Do not push or upload.
