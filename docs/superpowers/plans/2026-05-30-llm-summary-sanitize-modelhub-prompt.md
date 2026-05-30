# LLM Summary Sanitize ModelHub Prompt Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep invalid plan estimates such as `NaN` cost and fractional duration out of ModelHub prompts.

**Architecture:** Reuse the existing numeric guards in `llmSummary.ts` for both fallback text and ModelHub prompt payloads. Invalid cost becomes `null` in structured plan summary data and `待确认` in today advice; invalid duration becomes `null`.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Sanitize ModelHub plan estimates

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-llm-summary-sanitize-modelhub-prompt.md`
- Modify: `frontend/src/api/llmSummary.test.ts`
- Modify: `frontend/src/api/llmSummary.ts`

- [x] **Step 1: Add failing ModelHub prompt coverage**

Add a Vitest case that:

```ts
vi.stubGlobal("fetch", fetchMock);
await generatePlanSummary(planWithInvalidEstimates, configuredModelHub);
const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
expect(JSON.stringify(body)).not.toContain("NaN");
expect(JSON.stringify(body)).not.toContain("1.5");
```

Run from `frontend`:

```bash
npm test -- src/api/llmSummary.test.ts
```

Expected: FAIL because the ModelHub prompt currently includes raw invalid estimates.

- [x] **Step 2: Sanitize prompt values**

In `generatePlanSummary`, replace raw prompt values with guarded values:

```ts
cost: validPlanCost(plan.estimated_cost_yuan),
duration: validPlanDuration(plan.estimated_duration_minutes),
```

In `generateTodayAdvice`, use guarded cost text instead of checking `!= null`.

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
git add docs/superpowers/plans/2026-05-30-llm-summary-sanitize-modelhub-prompt.md frontend/src/api/llmSummary.test.ts frontend/src/api/llmSummary.ts
git commit -m "fix: sanitize modelhub summary prompts"
```

Expected: one local commit. Do not push or upload.
