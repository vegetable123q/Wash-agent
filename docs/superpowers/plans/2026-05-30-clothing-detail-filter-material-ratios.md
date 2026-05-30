# Clothing Detail Filter Material Ratios Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent invalid backend material ratios from rendering as `NaN%` or negative percentages on the clothing detail screen.

**Architecture:** Keep the change local to `ClothingDetailScreen.tsx` by filtering material ratio entries before formatting them. Existing behavior for valid ratios is preserved.

**Tech Stack:** React, TypeScript, Vitest, Testing Library.

---

### Task 1: Filter invalid material ratios in clothing detail UI

**Files:**
- Add: `docs/superpowers/plans/2026-05-30-clothing-detail-filter-material-ratios.md`
- Modify: `frontend/src/screens/ClothingDetailScreen.test.tsx`
- Modify: `frontend/src/screens/ClothingDetailScreen.tsx`

- [x] **Step 1: Add failing UI coverage**

Add a test rendering a backend item with:

```ts
material_ratios: { cotton: Number.NaN, wool: -0.2, silk: 0.4 }
```

Assert rendered text does not contain `NaN` or `-20%`, and still contains `silk 40%`.

Run from `frontend`:

```bash
npm test -- src/screens/ClothingDetailScreen.test.tsx
```

Expected: FAIL because the screen currently formats every ratio directly.

- [x] **Step 2: Implement positive finite ratio filtering**

Update `materialText` to filter entries:

```ts
const entries = Object.entries(materialRatios).filter(([, ratio]) => isPositiveFiniteNumber(ratio));
```

Add a small `isPositiveFiniteNumber` helper near `materialText`.

- [x] **Step 3: Run target and frontend verification**

Run from `frontend`:

```bash
npm test -- src/screens/ClothingDetailScreen.test.tsx
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
git add docs/superpowers/plans/2026-05-30-clothing-detail-filter-material-ratios.md frontend/src/screens/ClothingDetailScreen.test.tsx frontend/src/screens/ClothingDetailScreen.tsx
git commit -m "fix: filter clothing detail material ratios"
```

Expected: one local commit. Do not push or upload.
