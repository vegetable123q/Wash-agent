# Split Semicolon Color Values Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize string color payloads such as `blue; white` into separate translated colors.

**Architecture:** Keep the recursive `colorsText` normalization. Broaden only the string split regex so English and Chinese semicolons are treated like existing comma and slash separators.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/api/modelHubRecognition.test.ts`
  - Add coverage for semicolon-separated color strings.
- Modify: `frontend/src/api/modelHubRecognition.ts`
  - Include `;` and `；` in `colorsText` string separators.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the existing color normalization tests:

```ts
  it("splits semicolon-separated color strings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "blue white tee",
          material_ratios: { cotton: 1 },
          colors: "blue; white",
        }),
      ),
    );

    const result = await recognizeClothingText("blue white tee", modelHubConfig);

    expect(result.colors).toBe("蓝色、白色");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: FAIL because the current color splitter treats `blue; white` as one unknown color.

---

### Task 2: Broaden Color String Separators

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.ts`
- Test: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Write minimal implementation**

Change the split regex in `colorsText` from:

```ts
.split(/[、,，/]+/)
```

to:

```ts
.split(/[、,，/;；]+/)
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-split-semicolon-color-values.md`
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
git add docs/superpowers/plans/2026-05-30-split-semicolon-color-values.md frontend/src/api/modelHubRecognition.ts frontend/src/api/modelHubRecognition.test.ts
git commit -m "fix: split semicolon color values"
```

Expected: a local-only commit. Do not push or upload.
