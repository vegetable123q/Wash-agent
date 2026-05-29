# Normalize Legacy Wardrobe Items Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Keep the app usable when older local wardrobe records are missing fields such as `risks`, `colors`, or `user_notes`.

**Architecture:** Normalize localStorage wardrobe entries at the `readLocalWardrobeItems` boundary before they reach planning, reports, or screens. Use conservative defaults only for structural fields: missing arrays become `[]`, missing records become `{}`, invalid counts become `0`, and invalid names become `未命名衣物`.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest.

---

### Task 1: Add Legacy Wardrobe Regression Coverage

**Files:**
- Modify: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Write the failing test**

Add this test near the other local wardrobe storage tests:

```ts
  it("normalizes legacy wardrobe records with missing structural fields", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "legacy-tee",
          name: "旧 T 恤",
          wear_count_since_wash: "2",
        },
      ]),
    );

    const summary = await fetchMobileSummary();

    expect(summary.wardrobe.items[0]).toMatchObject({
      item_id: "legacy-tee",
      name: "旧 T 恤",
      user_note: "",
      user_notes: [],
      wear_count_since_wash: 2,
      wash_count: 0,
      material_ratios: {},
      colors: [],
      risks: {},
    });
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: FAIL because `storedToPlanItem` currently receives `risks: undefined` and cannot build frequency advice.

### Task 2: Normalize Stored Wardrobe Item Shape

**Files:**
- Modify: `frontend/src/api/mobileSummary.ts`

- [ ] **Step 1: Write minimal implementation**

Update `readLocalWardrobeItems` so it reads `unknown` records, maps them through `normalizeStoredWardrobeItem`, and then repairs duplicate IDs:

```ts
function readLocalWardrobeItems(): WardrobeSummaryItem[] {
  const parsed = readLocalStorageArray<unknown>(LOCAL_WARDROBE_STORAGE_KEY, "本地衣柜数据无法读取");
  const normalized = parsed.map(normalizeStoredWardrobeItem);
  const repaired = repairDuplicateWardrobeItemIds(normalized);
  if (repaired.changed) {
    writeLocalWardrobeItems(repaired.items);
  }
  return repaired.items;
}
```

Add helpers near the local-storage utilities:

```ts
function normalizeStoredWardrobeItem(value: unknown): WardrobeSummaryItem {
  const item = typeof value === "object" && value !== null ? (value as Partial<WardrobeSummaryItem>) : {};
  const photoDataUrl = validPhotoDataUrl(item.photo_data_url) ? item.photo_data_url : undefined;
  return {
    item_id: String(item.item_id ?? "").trim(),
    name: String(item.name ?? "未命名衣物").trim() || "未命名衣物",
    category: normalizeWardrobeCategory(item.category),
    user_note: String(item.user_note ?? "").trim(),
    user_notes: stringArray(item.user_notes),
    wear_count_since_wash: nonNegativeInteger(item.wear_count_since_wash),
    wash_count: nonNegativeInteger(item.wash_count),
    material_ratios: normalizeMaterialRatioRecord(item.material_ratios),
    colors: stringArray(item.colors),
    risks: normalizeRisks(item.risks),
    ...(photoDataUrl ? { photo_data_url: photoDataUrl } : {}),
  };
}
```

Add small helpers:

```ts
function stringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item).trim()).filter(Boolean) : [];
}

function nonNegativeInteger(value: unknown): number {
  const numeric = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof numeric === "number" && Number.isFinite(numeric) && numeric > 0 ? Math.floor(numeric) : 0;
}

function normalizeMaterialRatioRecord(value: unknown): Record<string, number> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const result: Record<string, number> = {};
  for (const [key, rawRatio] of Object.entries(value as Record<string, unknown>)) {
    const material = key.trim().toLowerCase();
    const ratio = typeof rawRatio === "string" && rawRatio.trim() ? Number(rawRatio) : rawRatio;
    if (material && typeof ratio === "number" && Number.isFinite(ratio) && ratio > 0) {
      result[material] = Math.min(ratio > 1 ? ratio / 100 : ratio, 1);
    }
  }
  return result;
}
```

Change `normalizeRisks` to accept `unknown` and return `{}` when the stored value is not a plain object.

- [ ] **Step 2: Run focused test**

Run: `npm test -- mobileSummary.test.ts --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-normalize-legacy-wardrobe-items.md`
- Modify: `frontend/src/api/mobileSummary.ts`
- Modify: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Run related screen tests**

Run: `npm test -- mobileSummary.test.ts WardrobeScreen.test.tsx DirtyBasketScreen.test.tsx ClothingDetailScreen.test.tsx --run`

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
git add docs/superpowers/plans/2026-05-30-normalize-legacy-wardrobe-items.md frontend/src/api/mobileSummary.ts frontend/src/api/mobileSummary.test.ts
git commit -m "fix: normalize legacy wardrobe records"
```
