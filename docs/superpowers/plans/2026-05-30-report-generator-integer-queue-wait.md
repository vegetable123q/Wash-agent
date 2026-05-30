# Report Generator Integer Queue Wait Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make generated wash reports avoid fractional campus queue wait text such as `1.5 分钟`.

**Architecture:** Keep queue wait formatting inside `reportGenerator`; only finite, non-negative integer waits are rendered, otherwise reports say the wait is unknown.

**Tech Stack:** TypeScript, Vitest, Vite, `npm`.

---

### Task 1: Guard report generator queue waits

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-report-generator-integer-queue-wait.md`
- Modify: `frontend/src/api/reportGenerator.test.ts`
- Modify: `frontend/src/api/reportGenerator.ts`

- [x] **Step 1: Add failing fractional queue wait coverage**

Add a report generator test with:

```ts
estimated_wait_minutes: 1.5,
```

and assert:

```ts
expect(JSON.stringify(report)).not.toContain("1.5");
```

Run from `frontend`:

```bash
npm test -- src/api/reportGenerator.test.ts
```

Expected: FAIL because generated reports currently render fractional waits.

- [x] **Step 2: Implement guarded queue wait formatting**

Add a small formatter:

```ts
function queueWaitText(minutes: number | null): string {
  return typeof minutes === "number" && Number.isInteger(minutes) && minutes >= 0
    ? `${minutes} 分钟`
    : "未知";
}
```

Use it in `queueSummary`.

- [x] **Step 3: Run target and full frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/reportGenerator.test.ts
npm test
npm run build
```

Run from repo root:

```bash
git diff --check
```

Expected: all PASS, ignoring existing CRLF warnings if present.

- [x] **Step 4: Commit locally**

Run:

```bash
git add docs/superpowers/plans/2026-05-30-report-generator-integer-queue-wait.md frontend/src/api/reportGenerator.test.ts frontend/src/api/reportGenerator.ts
git commit -m "fix: guard report generator queue wait"
```

Expected: one local commit. Do not push or upload.
