# Split Slash Care Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Normalize slash-separated ModelHub care label strings into separate translated notes.

**Architecture:** Keep the recursive `careTexts` extraction. Broaden only its string split regex so slash-delimited labels behave like comma, semicolon, and newline-delimited labels.

**Tech Stack:** React frontend support code, TypeScript, Vitest, npm.

---

## File Structure

- Modify: `frontend/src/api/modelHubRecognition.test.ts`
  - Add coverage for slash-separated care warning strings.
- Modify: `frontend/src/api/modelHubRecognition.ts`
  - Include `/` in `careTexts` string separators.

---

### Task 1: Add Regression Coverage

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the existing care label tests:

```ts
  it("splits slash-separated care label strings", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        modelHubResponse({
          is_clothing: true,
          name: "wool cardigan",
          material_ratios: { wool: 1 },
          colors: ["beige"],
          care_warnings: "hand_wash_only/do_not_tumble_dry",
        }),
      ),
    );

    const result = await recognizeClothingText("wool cardigan", modelHubConfig);

    expect(result.note).toContain("只能手洗");
    expect(result.note).toContain("不可烘干");
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: FAIL because the current care label splitter keeps the slash-delimited string as one unknown label.

---

### Task 2: Broaden Care Label String Separators

**Files:**
- Modify: `frontend/src/api/modelHubRecognition.ts`
- Test: `frontend/src/api/modelHubRecognition.test.ts`

- [ ] **Step 1: Write minimal implementation**

Change the split regex in `careTexts` from:

```ts
.split(/[、,，;；\n]+/)
```

to:

```ts
.split(/[、,，/;；\n]+/)
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm test -- modelHubRecognition.test.ts --run`

Expected: PASS.

---

### Task 3: Verify and Commit

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-split-slash-care-labels.md`
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
git add docs/superpowers/plans/2026-05-30-split-slash-care-labels.md frontend/src/api/modelHubRecognition.ts frontend/src/api/modelHubRecognition.test.ts
git commit -m "fix: split slash care labels"
```

Expected: a local-only commit. Do not push or upload.
