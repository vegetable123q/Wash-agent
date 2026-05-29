# Fenced Recognition JSON Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse ModelHub recognition JSON even when the model wraps the JSON object in a Markdown code fence.

**Architecture:** Keep the compatibility fix inside `parseGeminiJsonText` so image and text recognition share the same normalization path. Add one regression test that stubs a fenced `parts[].text` response, then strip only whole-response Markdown fences before `JSON.parse`.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add Fenced JSON Regression Coverage

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the existing invalid JSON test:

```ts
  it("parses recognition JSON wrapped in a markdown code fence", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubTextResponse('```json\n{"is_clothing":true,"name":"white tee","material_ratios":{"cotton":1},"colors":["white"]}\n```'),
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

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: FAIL with `ModelHub returned invalid recognition JSON`.

### Task 2: Strip Whole-Response Markdown JSON Fences

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.ts`

- [ ] **Step 1: Write minimal implementation**

Add a helper near `parseGeminiJsonText`:

```ts
function stripJsonCodeFence(text: string): string {
  const trimmed = text.trim();
  const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  return match ? match[1].trim() : trimmed;
}
```

Then change `JSON.parse(text)` to `JSON.parse(stripJsonCodeFence(text))`.

- [ ] **Step 2: Run focused test**

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-fenced-recognition-json.md`
- Modify: `frontend/src/api/modelHubRecognition.test.ts`
- Modify: `frontend/src/api/modelHubRecognition.ts`

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
git add docs/superpowers/plans/2026-05-30-fenced-recognition-json.md frontend/src/api/modelHubRecognition.ts frontend/src/api/modelHubRecognition.test.ts
git commit -m "fix: parse fenced recognition json"
```
