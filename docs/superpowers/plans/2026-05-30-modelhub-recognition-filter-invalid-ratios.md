# ModelHub Recognition Filter Invalid Ratios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent invalid explicit `material_ratios` entries from appearing as material names in ModelHub recognition output.

**Architecture:** Keep pure material strings unchanged, but treat invalid explicit ratio values in ratio objects as absent. `materialWithRatioText` returns an empty string for finite non-positive or nonnumeric explicit ratios, while still returning the material name when no ratio was provided.

**Tech Stack:** TypeScript, Vitest.

---

### Task 1: Filter invalid ModelHub material ratio entries

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-modelhub-recognition-filter-invalid-ratios.md`
- Modify: `frontend/src/api/modelHubRecognition.test.ts`
- Modify: `frontend/src/api/modelHubRecognition.ts`

- [x] **Step 1: Add failing recognition coverage**

Add a test with:

```ts
material_ratios: { zeroFiber: 0, badFiber: true, wool: 1 }
```

Assert `result.material` does not contain `zeroFiber` or `badFiber`, and still contains `100%`.

Run from `frontend`:

```bash
npm test -- src/api/modelHubRecognition.test.ts
```

Expected: FAIL because invalid explicit ratio entries currently fall back to raw material names.

- [x] **Step 2: Implement invalid explicit-ratio filtering**

Update `materialWithRatioText` so:

```ts
if (ratio == null) return name;
if (!Number.isFinite(numericRatio) || numericRatio <= 0) return "";
```

Keep valid positive ratios unchanged.

- [x] **Step 3: Run target and frontend verification**

Run from `frontend`:

```bash
npm test -- src/api/modelHubRecognition.test.ts
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
git add docs/superpowers/plans/2026-05-30-modelhub-recognition-filter-invalid-ratios.md frontend/src/api/modelHubRecognition.test.ts frontend/src/api/modelHubRecognition.ts
git commit -m "fix: filter invalid modelhub material ratios"
```

Expected: one local commit. Do not push or upload.
