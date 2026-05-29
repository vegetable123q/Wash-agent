# Normalize Colon Material Names Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Translate material names correctly when ModelHub returns ratio strings like `cotton: 80%`.

**Architecture:** Keep the existing material ratio parser. Normalize only material display-name lookup input by trimming trailing English or Chinese colons before `termKey` lookup.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/api/modelHubRecognition.test.ts`
  - Add coverage for colon-separated material ratios in a string field.
- Modify: `frontend/src/api/modelHubRecognition.ts`
  - Strip trailing `:` or `：` from material names before translation.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the existing material variant tests:

```ts
  it("normalizes colon-separated material ratio strings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "cotton polyester hoodie",
          material: "cotton: 80%, polyester: 20%",
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

Expected: FAIL because the current parser keeps the colon in `cotton:`.

---

### Task 2: Strip Trailing Material Colons

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.ts`
- Test: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Write minimal implementation**

Change:

```ts
const trimmed = value.trim();
```

inside `translateMaterialName` to:

```ts
const trimmed = value.trim().replace(/[：:]+$/, "");
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-normalize-colon-material-names.md`
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
git add docs/superpowers/plans/2026-05-30-normalize-colon-material-names.md frontend/src/api/modelHubRecognition.ts frontend/src/api/modelHubRecognition.test.ts
git commit -m "fix: normalize colon material names"
```

Expected: a local-only commit. Do not push or upload.
