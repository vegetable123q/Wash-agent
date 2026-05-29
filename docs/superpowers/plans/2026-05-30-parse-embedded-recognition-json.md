# Parse Embedded Recognition JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Accept ModelHub recognition responses that wrap a JSON object in ordinary prose instead of a markdown code fence.

**Architecture:** Keep the fix in the existing JSON text cleanup helper used before `JSON.parse`. Add a regression test around `recognizeClothingText`, then extract the substring between the first `{` and the last `}` when no fenced JSON block is present.

**Tech Stack:** TypeScript, Vitest, ModelHub recognition adapter.

---

### Task 1: Parse Prose-Wrapped Recognition JSON

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`
- Modify: `frontend/src/api/modelHubRecognition.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the existing recognition JSON parsing tests in `frontend/src/api/modelHubRecognition.test.ts`:

```ts
it("parses recognition JSON embedded in prose without a fence", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue(
      modelHubTextResponse('识别结果：{"is_clothing":true,"name":"white tee","material_ratios":{"cotton":1},"colors":["white"]} 请确认。'),
    ),
  );

  await expect(recognizeClothingText("white tee", modelHubConfig)).resolves.toMatchObject({
    name: "white tee",
    material: "棉 100%",
    colors: "白色",
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run:

```bash
npm test -- modelHubRecognition.test.ts --run
```

Expected: FAIL because the current parser only handles raw JSON or fenced JSON.

- [ ] **Step 3: Write minimal implementation**

In `frontend/src/api/modelHubRecognition.ts`, update `stripJsonCodeFence`:

```ts
function stripJsonCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
  if (match) return match[1].trim();
  const objectStart = trimmed.indexOf("{");
  const objectEnd = trimmed.lastIndexOf("}");
  if (objectStart >= 0 && objectEnd > objectStart) {
    return trimmed.slice(objectStart, objectEnd + 1).trim();
  }
  return trimmed;
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
git add docs/superpowers/plans/2026-05-30-parse-embedded-recognition-json.md frontend/src/api/modelHubRecognition.test.ts frontend/src/api/modelHubRecognition.ts
git commit -m "fix: parse embedded recognition json"
```

Expected: a local-only commit. Do not push or upload.
