# Clothing Detail Recommendation Title Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the fixed clothing-detail recommendation title with a color/risk-aware title so light items are not told to wash with dark clothes.

**Architecture:** Keep the display model built by `detailFromBackend` and `detailFromStatic`. Add a `recommendationTitle` field and compute backend titles from color text plus `color_bleed` risk.

**Tech Stack:** React/Vite frontend, TypeScript, Vitest, React Testing Library.

---

### Task 1: Add Recommendation Title Regression Coverage

**Files:**
- Modify: `frontend/src/screens/ClothingDetailScreen.test.tsx`

- [ ] **Step 1: Write the failing test**

Add this test:

```tsx
  it("does not tell light backend items to wash with dark clothes", () => {
    render(
      <ClothingDetailScreen
        onBack={vi.fn()}
        backendItem={wardrobeItem({
          item_id: "white-tee",
          name: "白色 T 恤",
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        })}
      />,
    );

    expect(screen.queryByText("与深色衣物同桶")).not.toBeInTheDocument();
    expect(screen.getByText("按浅色衣物清洗")).toBeInTheDocument();
  });
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test -- ClothingDetailScreen.test.tsx --run`

Expected: FAIL because the title is currently hard-coded as `与深色衣物同桶`.

### Task 2: Compute Recommendation Title

**Files:**
- Modify: `frontend/src/screens/ClothingDetailScreen.tsx`

- [ ] **Step 1: Write minimal implementation**

Replace the hard-coded title:

```tsx
<h3>{item.recommendationTitle}</h3>
```

Add `recommendationTitle` to both detail model builders:

```ts
recommendationTitle: recommendationTitleForBackend(item),
```

for backend items, and:

```ts
recommendationTitle: "查看洗护建议",
```

for static items.

Add helper:

```ts
function recommendationTitleForBackend(item: WardrobeSummaryItem): string {
  const colorText = item.colors.join(" ").toLowerCase();
  const colorBleedRisk = item.risks.color_bleed;
  if (colorBleedRisk === "high" || colorBleedRisk === "medium") {
    return "深浅色分开洗";
  }
  if (["黑", "深", "black", "dark", "navy"].some((term) => colorText.includes(term))) {
    return "深色衣物分开洗";
  }
  return "按浅色衣物清洗";
}
```

- [ ] **Step 2: Run focused test**

Run: `npm test -- ClothingDetailScreen.test.tsx --run`

Expected: PASS.

### Task 3: Verify and Commit Locally

**Files:**
- Create: `docs/superpowers/plans/2026-05-30-clothing-detail-recommendation-title.md`
- Modify: `frontend/src/screens/ClothingDetailScreen.tsx`
- Modify: `frontend/src/screens/ClothingDetailScreen.test.tsx`

- [ ] **Step 1: Run related checks**

Run: `npm test -- ClothingDetailScreen.test.tsx WardrobeScreen.test.tsx --run`

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
git add docs/superpowers/plans/2026-05-30-clothing-detail-recommendation-title.md frontend/src/screens/ClothingDetailScreen.tsx frontend/src/screens/ClothingDetailScreen.test.tsx
git commit -m "fix: tailor clothing detail recommendation title"
```
