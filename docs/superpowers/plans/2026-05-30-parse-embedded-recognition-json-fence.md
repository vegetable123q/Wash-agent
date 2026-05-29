# Parse Embedded Recognition JSON Fence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Parse ModelHub recognition JSON when a markdown JSON code fence is surrounded by explanatory text.

**Architecture:** Keep `parseGeminiJsonText` and `stripJsonCodeFence` as the single parsing path. Broaden `stripJsonCodeFence` to extract the first fenced JSON block anywhere in the text, while preserving direct JSON parsing for plain JSON responses.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/api/modelHubRecognition.test.ts`
  - Add coverage for explanatory prose before and after a fenced JSON response.
- Modify: `frontend/src/api/modelHubRecognition.ts`
  - Relax the code-fence regex from whole-string only to first fenced block extraction.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the existing fenced JSON test:

```ts
  it("parses recognition JSON from a fenced block surrounded by prose", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubTextResponse('识别结果如下：\n```json\n{"is_clothing":true,"name":"white tee","material_ratios":{"cotton":1},"colors":["white"]}\n```\n请确认。'),
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

---

### Task 2: Extract Embedded Fenced JSON

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.ts`
- Test: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Write minimal implementation**

Change:

```ts
const match = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
```

to:

```ts
const match = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i);
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-parse-embedded-recognition-json-fence.md`
- Modify: `frontend/src/api/modelHubRecognition.ts`
- Modify: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Run full frontend tests**

Run: `npm test -- --run`

Expected: PASS with all frontend test files green.

- [ ] **Step 2: Run production build**

Run: `npm run build`

Expected: PASS with TypeScript and Vite build completing successfully.

- [ ] **Step 3: Check whitespace**

Run: `git diff --check`

Expected: exit code 0.

- [ ] **Step 4: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-parse-embedded-recognition-json-fence.md frontend/src/api/modelHubRecognition.ts frontend/src/api/modelHubRecognition.test.ts
git commit -m "fix: parse embedded recognition json fences"
```

Expected: a local-only commit. Do not push or upload.
