# Reset Today LLM Advice Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent the Today dashboard from showing stale AI-generated advice after the connected laundry summary changes and the next advice call falls back.

**Architecture:** `TodayScreen` already renders `llmAdvice ?? planSummary.note`. The fix resets the transient LLM advice when the summary/config inputs change, so the deterministic plan note is visible while fresh advice is pending or unavailable.

**Tech Stack:** React, TypeScript, Vitest, Testing Library, Vite.

---

### Task 1: Reproduce Stale Today Advice

**Files:**
- Modify: `frontend/src/screens/TodayScreen.test.tsx`

- [x] **Step 1: Mock today advice generation**

Add a partial mock for `generateTodayAdvice`, preserving the real `computeRecommendedStartTime` export:

```ts
import { emptyModelHubConfig } from "../api/modelHubConfig";
import { generateTodayAdvice } from "../api/llmSummary";

vi.mock("../api/llmSummary", async () => {
  const actual = await vi.importActual<typeof import("../api/llmSummary")>("../api/llmSummary");
  return {
    ...actual,
    generateTodayAdvice: vi.fn(),
  };
});
```

- [x] **Step 2: Write the failing test**

Add a test that renders a connected summary with LLM advice, rerenders with a different summary whose advice generation returns fallback, and asserts the old LLM text disappears:

```ts
it("clears the previous LLM advice when switching connected summaries", async () => {
  vi.mocked(generateTodayAdvice)
    .mockResolvedValueOnce({ source: "llm", text: "first AI today advice" })
    .mockResolvedValueOnce({ source: "fallback", text: "second fallback today advice" });

  const { rerender } = render(
    <TodayScreen
      backendStatus="connected"
      mobileSummary={mobileSummaryWithPlanNote("first deterministic today note", "light-standard")}
      modelHubConfig={configuredModelHub}
      onNavigate={vi.fn()}
    />,
  );

  expect(await screen.findByText("first AI today advice")).toBeInTheDocument();

  rerender(
    <TodayScreen
      backendStatus="connected"
      mobileSummary={mobileSummaryWithPlanNote("second deterministic today note", "dark-standard")}
      modelHubConfig={configuredModelHub}
      onNavigate={vi.fn()}
    />,
  );

  await waitFor(() => expect(generateTodayAdvice).toHaveBeenCalledTimes(2));
  expect(screen.queryByText("first AI today advice")).not.toBeInTheDocument();
  expect(screen.getByText("second deterministic today note")).toBeInTheDocument();
});
```

- [x] **Step 3: Run the focused test and verify RED**

Run:

```bash
npm test -- TodayScreen.test.tsx --run
```

Expected: the new test fails because `first AI today advice` remains visible after rerender.

### Task 2: Reset Transient Today Advice

**Files:**
- Modify: `frontend/src/screens/TodayScreen.tsx`

- [x] **Step 1: Clear transient state before generation**

At the start of the `useEffect` that calls `generateTodayAdvice`, clear `llmAdvice` before the early return:

```ts
useEffect(() => {
  setLlmAdvice(null);
  if (!mobileSummary?.plan || !modelHubConfig) return;
  let cancelled = false;
  generateTodayAdvice(
    mobileSummary.plan,
    mobileSummary.weather,
    mobileSummary.frequency_advice,
    modelHubConfig,
  ).then((result) => {
    if (!cancelled && result.source === "llm") setLlmAdvice(result.text);
  });
  return () => { cancelled = true; };
}, [mobileSummary, modelHubConfig]);
```

- [x] **Step 2: Run the focused test and verify GREEN**

Run:

```bash
npm test -- TodayScreen.test.tsx --run
```

Expected: all `TodayScreen` tests pass.

### Task 3: Verify and Commit Locally

**Files:**
- Verify: `frontend/src/screens/TodayScreen.tsx`
- Verify: `frontend/src/screens/TodayScreen.test.tsx`

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
git add docs/superpowers/plans/2026-05-30-reset-today-llm-advice.md frontend/src/screens/TodayScreen.tsx frontend/src/screens/TodayScreen.test.tsx
git commit -m "fix: reset today advice"
```

Expected: local commit is created. Do not push or upload.
