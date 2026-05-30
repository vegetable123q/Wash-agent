# Add Mixed Standard Display Labels Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make frontend summaries, reports, and screens display a user-facing label for `mixed-standard` instead of leaking the internal bucket ID or falling back to generic copy.

**Architecture:** Add `mixed-standard` to existing local label/reason maps. Do not introduce a new shared abstraction in this pass; keep the change small and consistent with current duplicated maps.

**Tech Stack:** TypeScript, React, Vitest, Vite, `npm`.

---

### Task 1: Add mixed-standard display labels

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-add-mixed-standard-display-labels.md`
- Modify: `frontend/src/api/llmSummary.test.ts`
- Modify: `frontend/src/screens/TodayScreen.test.tsx`
- Modify: `frontend/src/api/llmSummary.ts`
- Modify: `frontend/src/api/reportGenerator.ts`
- Modify: `frontend/src/screens/TodayScreen.tsx`
- Modify: `frontend/src/screens/PlanDetailScreen.tsx`
- Modify: `frontend/src/screens/ReportScreen.tsx`

- [x] **Step 1: Add failing tests**

In `llmSummary.test.ts`, import `bucketLabel` and add:

```ts
it("labels mixed standard buckets without leaking internal ids", () => {
  expect(bucketLabel("mixed-standard")).toBe("混色标准");
  expect(bucketLabel("mixed-standard-2")).toBe("混色标准");
});
```

In `TodayScreen.test.tsx`, add:

```tsx
it("shows mixed standard bucket labels instead of internal ids", () => {
  render(
    <TodayScreen
      backendStatus="connected"
      mobileSummary={mobileSummaryWithPlanNote("mixed plan", "mixed-standard")}
      onNavigate={vi.fn()}
    />,
  );

  expect(screen.getByText("混色标准洗")).toBeInTheDocument();
  expect(screen.queryByText("mixed-standard")).not.toBeInTheDocument();
});
```

Run from `frontend`: `npm test -- src/api/llmSummary.test.ts src/screens/TodayScreen.test.tsx`

Expected: FAIL because `mixed-standard` currently falls through at least one user-facing label map.

- [x] **Step 2: Add API labels**

In `llmSummary.ts`, add:

```ts
"mixed-standard": "混色标准",
```

In `reportGenerator.ts`, add:

```ts
"mixed-standard": "用户允许混色，低掉色风险普通衣物合并标准洗",
```

and:

```ts
"mixed-standard": "混色标准洗",
```

- [x] **Step 3: Add screen labels**

Add `"mixed-standard": "混色标准洗"` to:

- `TodayScreen.tsx`
- `PlanDetailScreen.tsx`
- `ReportScreen.tsx`

- [x] **Step 4: Run target and full frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/llmSummary.test.ts src/screens/TodayScreen.test.tsx
npm test
npm run build
```

Run from repo root:

```bash
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 5: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-add-mixed-standard-display-labels.md frontend/src/api/llmSummary.test.ts frontend/src/screens/TodayScreen.test.tsx frontend/src/api/llmSummary.ts frontend/src/api/reportGenerator.ts frontend/src/screens/TodayScreen.tsx frontend/src/screens/PlanDetailScreen.tsx frontend/src/screens/ReportScreen.tsx
git commit -m "fix: label mixed standard buckets"
```

Expected: one local commit. Do not push or upload.
