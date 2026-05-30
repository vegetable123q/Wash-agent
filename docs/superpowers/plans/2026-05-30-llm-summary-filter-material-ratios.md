# LLM Summary Filter Material Ratios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent invalid material ratios from appearing as `NaN%` or negative percentages in risk summaries and ModelHub prompts.

**Architecture:** Add a shared formatter in `llmSummary.ts` for material ratio percentages. Both ModelHub risk prompts and fallback risk text use the same finite positive ratio filter.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Filter invalid material ratios in risk text

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-llm-summary-filter-material-ratios.md`
- Modify: `frontend/src/api/llmSummary.test.ts`
- Modify: `frontend/src/api/llmSummary.ts`

- [x] **Step 1: Add failing risk summary coverage**

Add a Vitest case that passes material ratios such as:

```ts
{ cotton: Number.NaN, wool: -0.2, silk: 0.4 }
```

Assert fallback risk text and ModelHub prompt do not contain `NaN` or `-20%`, while keeping the valid `silk 40%`.

Run from `frontend`:

```bash
npm test -- src/api/llmSummary.test.ts
```

Expected: FAIL because risk text currently formats every ratio directly.

- [x] **Step 2: Implement shared material ratio filtering**

Add helpers like:

```ts
function materialRatioParts(materialRatios: Record<string, number>): string[] {
  return Object.entries(materialRatios)
    .filter(([, ratio]) => isPositiveFiniteNumber(ratio))
    .map(([material, ratio]) => `${material} ${Math.round(ratio * 100)}%`);
}
```

Use those helpers in both `generateRiskDescription` and `fallbackRiskDescription`.

- [x] **Step 3: Run target and frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/llmSummary.test.ts
npm test
```

Run from repo root:

```bash
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 4: Commit locally**

Run from repo root:

```bash
git add docs/superpowers/plans/2026-05-30-llm-summary-filter-material-ratios.md frontend/src/api/llmSummary.test.ts frontend/src/api/llmSummary.ts
git commit -m "fix: filter invalid material ratios in summaries"
```

Expected: one local commit. Do not push or upload.
