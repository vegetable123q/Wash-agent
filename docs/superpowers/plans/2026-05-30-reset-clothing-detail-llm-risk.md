# Reset Clothing Detail LLM Risk Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent a previous item's LLM-generated risk description from remaining visible after the clothing detail view switches to another item.

**Architecture:** Add a focused React Testing Library test for `ClothingDetailScreen` and reset `llmRiskText` at the start of the effect that reacts to `backendItem` or `modelHubConfig` changes. Keep fallback rendering unchanged.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest, React Testing Library.

---

### Task 1: Add Detail Screen Regression Coverage

**Files:**
- Create: `frontend/src/screens/ClothingDetailScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Create a test that:
- mocks `generateRiskDescription`
- renders item A with an LLM result
- rerenders with item B whose summary result is fallback
- asserts item A's LLM text is no longer visible

Use this shape:

```tsx
vi.mock("../api/llmSummary", async () => {
  const actual = await vi.importActual<typeof import("../api/llmSummary")>("../api/llmSummary");
  return {
    ...actual,
    generateRiskDescription: vi.fn(),
  };
});

it("clears the previous LLM risk text when switching backend items", async () => {
  vi.mocked(generateRiskDescription)
    .mockResolvedValueOnce({ source: "llm", text: "第一件的 AI 风险描述" })
    .mockResolvedValueOnce({ source: "fallback", text: "第二件 fallback" });

  const { rerender } = render(<ClothingDetailScreen onBack={vi.fn()} backendItem={firstItem} modelHubConfig={modelHubConfig} />);

  expect(await screen.findByText("第一件的 AI 风险描述")).toBeInTheDocument();

  rerender(<ClothingDetailScreen onBack={vi.fn()} backendItem={secondItem} modelHubConfig={modelHubConfig} />);

  await waitFor(() => expect(generateRiskDescription).toHaveBeenCalledTimes(2));
  expect(screen.queryByText("第一件的 AI 风险描述")).not.toBeInTheDocument();
  expect(screen.getByText(/羊毛开衫：变形风险较高/)).toBeInTheDocument();
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ClothingDetailScreen.test.tsx --run`

Expected: FAIL because `llmRiskText` is not cleared when `backendItem` changes.

### Task 2: Reset LLM Risk Text on Dependency Changes

**Files:**
- Modify: `frontend/src/screens/ClothingDetailScreen.tsx`

- [ ] **Step 1: Write minimal implementation**

At the start of the existing `useEffect`, before the early return, add:

```ts
setLlmRiskText(null);
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- ClothingDetailScreen.test.tsx --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-reset-clothing-detail-llm-risk.md`
- Create: `frontend/src/screens/ClothingDetailScreen.test.tsx`
- Modify: `frontend/src/screens/ClothingDetailScreen.tsx`

- [ ] **Step 1: Run related checks**

Run: `npm test -- ClothingDetailScreen.test.tsx WardrobeScreen.test.tsx --run`

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
git add docs/superpowers/plans/2026-05-30-reset-clothing-detail-llm-risk.md frontend/src/screens/ClothingDetailScreen.tsx frontend/src/screens/ClothingDetailScreen.test.tsx
git commit -m "fix: reset clothing detail risk summary"
```
