# Reset Plan Detail LLM Summary Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the plan detail screen from showing a stale AI-generated summary after the selected laundry plan changes and the next summary falls back to deterministic text.

**Architecture:** The screen already renders `llmSummary ?? mobileSummary.plan.summary`. The fix keeps that architecture and resets the transient LLM text whenever the plan/config input changes, so the current plan summary remains authoritative while async LLM generation is pending or falls back.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite.

---

### Task 1: Reproduce Stale Plan Summary

**Files:**
- Modify: `frontend/src/screens/PlanDetailScreen.test.tsx`

- [x] **Step 1: Mock plan summary generation**

Add a partial mock for `generatePlanSummary`:

```ts
import { emptyModelHubConfig } from "../api/modelHubConfig";
import { generatePlanSummary } from "../api/llmSummary";

vi.mock("../api/llmSummary", async () => {
  const actual = await vi.importActual<typeof import("../api/llmSummary")>("../api/llmSummary");
  return {
    ...actual,
    generatePlanSummary: vi.fn(),
  };
});
```

- [x] **Step 2: Write the failing test**

Add a test that renders a plan with an LLM summary, rerenders with a different plan whose summary generation returns fallback, and asserts the old LLM text disappears:

```ts
it("clears the previous LLM plan summary when switching plans", async () => {
  vi.mocked(generatePlanSummary)
    .mockResolvedValueOnce({ source: "llm", text: "first AI plan summary" })
    .mockResolvedValueOnce({ source: "fallback", text: "second fallback plan summary" });

  const { rerender } = render(
    <PlanDetailScreen
      onBack={vi.fn()}
      mobileSummary={mobileSummaryWithPlan("first deterministic plan", "light-standard")}
      modelHubConfig={configuredModelHub}
    />,
  );

  expect(await screen.findByText("first AI plan summary")).toBeInTheDocument();

  rerender(
    <PlanDetailScreen
      onBack={vi.fn()}
      mobileSummary={mobileSummaryWithPlan("second deterministic plan", "dark-standard")}
      modelHubConfig={configuredModelHub}
    />,
  );

  await waitFor(() => expect(generatePlanSummary).toHaveBeenCalledTimes(2));
  expect(screen.queryByText("first AI plan summary")).not.toBeInTheDocument();
  expect(screen.getByText("second deterministic plan")).toBeInTheDocument();
});
```

- [x] **Step 3: Run the focused test and verify RED**

Run:

```bash
npm test -- PlanDetailScreen.test.tsx --run
```

Expected: the new test fails because `first AI plan summary` remains visible after rerender.

### Task 2: Reset Transient LLM Summary

**Files:**
- Modify: `frontend/src/screens/PlanDetailScreen.tsx`

- [x] **Step 1: Clear transient state before generation**

At the start of the `useEffect` that calls `generatePlanSummary`, clear `llmSummary` before the early return:

```ts
useEffect(() => {
  setLlmSummary(null);
  if (!mobileSummary?.plan || !modelHubConfig) return;
  let cancelled = false;
  generatePlanSummary(mobileSummary.plan, modelHubConfig).then((result) => {
    if (!cancelled && result.source === "llm") setLlmSummary(result.text);
  });
  return () => { cancelled = true; };
}, [mobileSummary?.plan, modelHubConfig]);
```

- [x] **Step 2: Run the focused test and verify GREEN**

Run:

```bash
npm test -- PlanDetailScreen.test.tsx --run
```

Expected: all `PlanDetailScreen` tests pass.

### Task 3: Verify and Commit Locally

**Files:**
- Verify: `frontend/src/screens/PlanDetailScreen.tsx`
- Verify: `frontend/src/screens/PlanDetailScreen.test.tsx`

- [x] **Step 1: Run complete frontend tests**

Run:

```bash
npm test -- --run
```

Expected: all frontend test files pass.

- [x] **Step 2: Run production build**

Run:

```bash
npm run build
```

Expected: Vite build exits with code 0.

- [x] **Step 3: Check whitespace**

Run:

```bash
git diff --check
```

Expected: no output and exit code 0.

- [x] **Step 4: Commit locally without pushing**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-reset-plan-detail-llm-summary.md frontend/src/screens/PlanDetailScreen.tsx frontend/src/screens/PlanDetailScreen.test.tsx
git commit -m "fix: reset plan detail summary"
```

Expected: local commit is created. Do not push or upload.
