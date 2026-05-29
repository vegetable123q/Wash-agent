# Dirty Basket And Machine Card Equalization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mobile app match real student laundry behavior by turning the current selected-items flow into a dirty-basket experience, and make laundry machine cards render at a uniform size.

**Architecture:** Keep the change inside the self-contained React/TypeScript mobile frontend. Reuse the existing `selected_laundry_item_ids` flow as the source of truth, add a derived dirty-basket summary to `MobileSummary`, and render it on Today and Wardrobe without adding backend services or network calls. Keep machine card equalization as CSS/layout polish in the existing Laundry Room screen.

**Tech Stack:** Vite, React, TypeScript, Vitest, Testing Library, CSS custom properties.

---

## File Structure

- Modify `frontend/src/api/types.ts`: add a `DirtyBasketSummary` contract and expose it from `MobileSummary`.
- Modify `frontend/src/api/mobileSummary.ts`: derive dirty-basket count, rough load percent, recommendation, and next action from selected laundry items.
- Modify `frontend/src/screens/WardrobeScreen.tsx`: present selected items as “脏衣篮/攒洗”, including load progress and practical action text.
- Modify `frontend/src/screens/TodayScreen.tsx`: show empty-basket guidance when connected with no selected items, and show dirty-basket progress when items are selected.
- Modify `frontend/src/screens/LaundryRoomScreen.tsx`: add stable text hooks/classes for equal-height machine cards.
- Modify `frontend/src/styles.css`: add dirty-basket progress styles and make `.machine-card` a fixed, equal-height card with safe text wrapping/clamping.
- Modify tests:
  - `frontend/src/api/mobileSummary.test.ts`
  - `frontend/src/screens/WardrobeScreen.test.tsx`
  - `frontend/src/screens/TodayScreen.test.tsx`
  - `frontend/src/screens/LaundryRoomScreen.test.tsx`

No Python backend files or architecture docs need to change because this is frontend-only product behavior.

---

### Task 1: Add Dirty-Basket Summary Data

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/mobileSummary.ts`
- Test: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Write the dirty-basket summary type**

Add this interface in `frontend/src/api/types.ts` near the `MobileSummary` contract:

```ts
export interface DirtyBasketSummary {
  item_count: number;
  load_percent: number;
  status_label: string;
  recommendation: string;
  next_action: string;
}
```

Add this field to `MobileSummary`:

```ts
dirty_basket: DirtyBasketSummary;
```

- [ ] **Step 2: Write the failing API test**

In `frontend/src/api/mobileSummary.test.ts`, add assertions to the existing selection test:

```ts
expect(summary.dirty_basket).toMatchObject({
  item_count: 1,
  load_percent: 30,
  status_label: "还没满桶",
});
expect(summary.dirty_basket.recommendation).toContain("可继续攒");
```

Also add an empty-user assertion:

```ts
expect(summary.dirty_basket.item_count).toBe(0);
expect(summary.dirty_basket.status_label).toBe("空篮");
```

- [ ] **Step 3: Run the focused test and confirm it fails**

Run:

```powershell
cd frontend
npm test -- mobileSummary.test.ts
```

Expected: FAIL because `dirty_basket` is not implemented yet.

- [ ] **Step 4: Implement `buildDirtyBasketSummary`**

In `frontend/src/api/mobileSummary.ts`, import the new type and add:

```ts
function buildDirtyBasketSummary(selectedItems: WardrobeSummaryItem[]): DirtyBasketSummary {
  const itemCount = selectedItems.length;
  const loadPercent = Math.min(100, itemCount * 30);
  const hasUrgent = selectedItems.some((item) =>
    [item.name, item.user_note, ...(item.user_notes ?? [])].join(" ").includes("明天要穿"),
  );

  if (itemCount === 0) {
    return {
      item_count: 0,
      load_percent: 0,
      status_label: "空篮",
      recommendation: "先把脏衣服加入脏衣篮，再生成本次洗衣方案。",
      next_action: "去衣柜选择这批要洗的衣物",
    };
  }
  if (hasUrgent) {
    return {
      item_count: itemCount,
      load_percent: loadPercent,
      status_label: "有急用衣物",
      recommendation: "这批里有明天要穿的衣物，建议今天洗，不必继续等满桶。",
      next_action: "查看本次方案",
    };
  }
  if (loadPercent >= 80) {
    return {
      item_count: itemCount,
      load_percent: loadPercent,
      status_label: "基本够一桶",
      recommendation: "这批脏衣已经接近一桶，可以直接生成方案。",
      next_action: "查看本次方案",
    };
  }
  return {
    item_count: itemCount,
    load_percent: loadPercent,
    status_label: "还没满桶",
    recommendation: "普通衣物还可以继续攒；运动衣、贴身衣物或潮湿衣物建议别久放。",
    next_action: "继续攒或先洗急用衣物",
  };
}
```

When returning `MobileSummary`, compute:

```ts
const selectedItems = storedItems.filter((item) => selectedLaundryItemIds.includes(item.item_id));
...
dirty_basket: buildDirtyBasketSummary(selectedItems),
```

- [ ] **Step 5: Run the focused test and confirm it passes**

Run:

```powershell
cd frontend
npm test -- mobileSummary.test.ts
```

Expected: PASS.

---

### Task 2: Render Dirty Basket On Wardrobe

**Files:**
- Modify: `frontend/src/screens/WardrobeScreen.tsx`
- Modify: `frontend/src/styles.css`
- Test: `frontend/src/screens/WardrobeScreen.test.tsx`

- [ ] **Step 1: Write the failing screen test**

In `frontend/src/screens/WardrobeScreen.test.tsx`, extend `selectableSummary` with:

```ts
dirty_basket: {
  item_count: 1,
  load_percent: 30,
  status_label: "还没满桶",
  recommendation: "普通衣物还可以继续攒；运动衣、贴身衣物或潮湿衣物建议别久放。",
  next_action: "继续攒或先洗急用衣物",
},
```

Then assert:

```ts
expect(screen.getByRole("heading", { name: "脏衣篮" })).toBeInTheDocument();
expect(screen.getByText("约 30% 桶")).toBeInTheDocument();
expect(screen.getByText("普通衣物还可以继续攒；运动衣、贴身衣物或潮湿衣物建议别久放。")).toBeInTheDocument();
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```powershell
cd frontend
npm test -- WardrobeScreen.test.tsx
```

Expected: FAIL because the dirty-basket section is not rendered yet.

- [ ] **Step 3: Implement the Wardrobe dirty-basket panel**

In `frontend/src/screens/WardrobeScreen.tsx`, derive:

```ts
const dirtyBasket = mobileSummary?.dirty_basket ?? {
  item_count: 0,
  load_percent: 0,
  status_label: "空篮",
  recommendation: "把这次要洗的衣物勾进脏衣篮。",
  next_action: "勾选衣物",
};
```

Add a `Section title="脏衣篮"` before “衣物卡片”:

```tsx
<Section title="脏衣篮" action={<Chip tone={dirtyBasket.item_count ? "teal" : "amber"}>{dirtyBasket.status_label}</Chip>}>
  <Card accent="teal" className="dirty-basket-card">
    <div className="dirty-basket-head">
      <div>
        <h3>{dirtyBasket.item_count} 件在盆里</h3>
        <p>{dirtyBasket.recommendation}</p>
      </div>
      <strong>约 {dirtyBasket.load_percent}% 桶</strong>
    </div>
    <div className="progress-bar dirty-basket-progress" aria-label="脏衣篮容量">
      <span style={{ width: `${dirtyBasket.load_percent}%` }} />
    </div>
    <p>{dirtyBasket.next_action}</p>
  </Card>
</Section>
```

- [ ] **Step 4: Add styles**

In `frontend/src/styles.css`, add `.dirty-basket-card`, `.dirty-basket-head`, and `.dirty-basket-progress` styles near existing progress styles.

- [ ] **Step 5: Run the focused test and confirm it passes**

Run:

```powershell
cd frontend
npm test -- WardrobeScreen.test.tsx
```

Expected: PASS.

---

### Task 3: Render Dirty Basket On Today

**Files:**
- Modify: `frontend/src/screens/TodayScreen.tsx`
- Test: `frontend/src/screens/TodayScreen.test.tsx`

- [ ] **Step 1: Update the connected empty-state test**

In `frontend/src/screens/TodayScreen.test.tsx`, add `dirty_basket` to the empty connected summary:

```ts
dirty_basket: {
  item_count: 0,
  load_percent: 0,
  status_label: "空篮",
  recommendation: "先把脏衣服加入脏衣篮，再生成本次洗衣方案。",
  next_action: "去衣柜选择这批要洗的衣物",
},
```

Keep the existing assertions for:

```ts
expect(screen.getByText("暂无已选衣物")).toBeInTheDocument();
expect(screen.getByText("请到衣柜勾选这批要清洗的衣物。")).toBeInTheDocument();
```

- [ ] **Step 2: Add a non-empty basket test**

Add a connected summary with one selected item and `dirty_basket.status_label = "还没满桶"`, then assert:

```ts
expect(screen.getByRole("heading", { name: "脏衣篮判断" })).toBeInTheDocument();
expect(screen.getByText("还没满桶")).toBeInTheDocument();
expect(screen.getByText("约 30% 桶")).toBeInTheDocument();
```

- [ ] **Step 3: Run the focused test and confirm it fails**

Run:

```powershell
cd frontend
npm test -- TodayScreen.test.tsx
```

Expected: FAIL before Today renders the dirty-basket section correctly.

- [ ] **Step 4: Fix `todayItems` empty connected behavior**

In `frontend/src/screens/TodayScreen.tsx`, change `todayItems` so connected empty plans return:

```ts
if (connected && !mobileSummary?.plan.buckets.length) {
  return [
    {
      id: "empty-basket",
      label: "暂无已选衣物",
      description: "请到衣柜勾选这批要清洗的衣物。",
      tone: "amber" as const,
      badge: { label: "空篮", tone: "amber" as const },
    },
  ];
}
```

Offline/static preview may keep `todaySummary.items`.

- [ ] **Step 5: Add Today dirty-basket section**

After “后端方案摘要” and before “本次衣物”, render:

```tsx
{connected && mobileSummary?.dirty_basket ? (
  <Section title="脏衣篮判断" action={<Chip tone={mobileSummary.dirty_basket.item_count ? "teal" : "amber"}>{mobileSummary.dirty_basket.status_label}</Chip>}>
    <Card accent="teal" className="dirty-basket-card">
      <div className="dirty-basket-head">
        <div>
          <h3>{mobileSummary.dirty_basket.next_action}</h3>
          <p>{mobileSummary.dirty_basket.recommendation}</p>
        </div>
        <strong>约 {mobileSummary.dirty_basket.load_percent}% 桶</strong>
      </div>
      <div className="progress-bar dirty-basket-progress" aria-label="脏衣篮容量">
        <span style={{ width: `${mobileSummary.dirty_basket.load_percent}%` }} />
      </div>
    </Card>
  </Section>
) : null}
```

- [ ] **Step 6: Run the focused test and confirm it passes**

Run:

```powershell
cd frontend
npm test -- TodayScreen.test.tsx
```

Expected: PASS.

---

### Task 4: Equalize Laundry Machine Card Size

**Files:**
- Modify: `frontend/src/screens/LaundryRoomScreen.tsx`
- Modify: `frontend/src/styles.css`
- Test: `frontend/src/screens/LaundryRoomScreen.test.tsx`

- [ ] **Step 1: Write the layout-facing test**

In `frontend/src/screens/LaundryRoomScreen.test.tsx`, assert all live machine cards use a stable equal-size class:

```ts
expect(document.querySelectorAll(".machine-card.machine-card-equal")).toHaveLength(3);
```

- [ ] **Step 2: Run the focused test and confirm it fails**

Run:

```powershell
cd frontend
npm test -- LaundryRoomScreen.test.tsx
```

Expected: FAIL because `.machine-card-equal` is not applied yet.

- [ ] **Step 3: Add the stable class**

In `frontend/src/screens/LaundryRoomScreen.tsx`, change live machine cards to:

```tsx
className="machine-card machine-card-equal"
```

Keep the empty-state card as just `machine-card`.

- [ ] **Step 4: Equalize card layout in CSS**

In `frontend/src/styles.css`, update:

```css
.machine-list {
  display: grid;
  gap: 9px;
  grid-auto-rows: 112px;
}

.machine-card {
  min-height: 112px;
  height: 100%;
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: 9px;
  padding-right: 32px;
  overflow: hidden;
}

.machine-card > div {
  min-width: 0;
}

.machine-title h3,
.machine-card p {
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
}

.machine-title h3 {
  -webkit-line-clamp: 2;
}

.machine-card p {
  -webkit-line-clamp: 1;
}
```

- [ ] **Step 5: Run the focused test and confirm it passes**

Run:

```powershell
cd frontend
npm test -- LaundryRoomScreen.test.tsx
```

Expected: PASS.

---

### Task 5: Full Frontend Verification

**Files:**
- No new edits expected unless verification exposes a defect.

- [ ] **Step 1: Run all frontend tests**

Run:

```powershell
cd frontend
npm test
```

Expected: PASS.

- [ ] **Step 2: Run the production build**

Run:

```powershell
cd frontend
npm run build
```

Expected: PASS.

- [ ] **Step 3: Visual check with local browser preview**

Run:

```powershell
cd frontend
npm run dev -- --host 127.0.0.1
```

Expected: Vite serves the app locally. Open the local URL and inspect Today, Wardrobe, and Laundry Room. Confirm the dirty-basket text appears and all machine cards have the same height.
