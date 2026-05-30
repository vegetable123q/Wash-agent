# Clothing Extractor Filter Zero Ratios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent explicit `0%` material ratios from being preserved or turned into equal-distribution material ratios.

**Architecture:** Update `parseMaterialRatios` in `clothingExtractor.ts` to track whether explicit percentages were provided. Positive explicit ratios are kept; zero ratios are dropped; if explicit ratios were present but none are positive, return an empty ratio record instead of falling back to equal distribution.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Filter zero material ratios in clothing extraction

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-clothing-extractor-filter-zero-ratios.md`
- Modify: `frontend/src/api/clothingExtractor.test.ts`
- Modify: `frontend/src/api/clothingExtractor.ts`

- [x] **Step 1: Add failing material parsing coverage**

Add tests asserting:

```ts
material_text: "cotton 0%, wool 100%"
// material_ratios === { wool: 1 }

material_text: "cotton 0%"
// material_ratios === {}
```

Run from `frontend`:

```bash
npm test -- src/api/clothingExtractor.test.ts
```

Expected: FAIL because `0%` is currently preserved or falls back to equal distribution.

- [x] **Step 2: Implement explicit-ratio filtering**

Inside `parseMaterialRatios`:

```ts
let sawExplicitRatio = false;
...
if (match) {
  sawExplicitRatio = true;
  ...
  if (ratio > 0) parsed[name] = Math.min(ratio, 1);
}
if (!Object.keys(parsed).length && sawExplicitRatio) return {};
```

- [x] **Step 3: Run target and frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/clothingExtractor.test.ts
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
git add docs/superpowers/plans/2026-05-30-clothing-extractor-filter-zero-ratios.md frontend/src/api/clothingExtractor.test.ts frontend/src/api/clothingExtractor.ts
git commit -m "fix: filter zero material ratios in extractor"
```

Expected: one local commit. Do not push or upload.
