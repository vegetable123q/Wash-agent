# Home Dirty Basket Workflow Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Reframe the mobile app so Wardrobe is only a categorized clothing inventory, while Today owns the dirty-basket summary and a dedicated Dirty Basket secondary screen manages which clothes are dirty and how many days they have been sitting there.

**Architecture:** Keep the existing local TypeScript mobile-service architecture. Persist dirty-basket records in the current laundry-selection localStorage key, but upgrade the stored shape from plain item id arrays to records with `item_id` and `added_at`; keep `selected_laundry_item_ids` derived for planner compatibility. Add one focused screen, `DirtyBasketScreen`, and route it from Today.

**Tech Stack:** React, TypeScript, Vite, Vitest, Testing Library, CSS.

---

## File Structure

- Modify `frontend/src/api/types.ts`: add `DirtyBasketItem` and extend `DirtyBasketSummary`.
- Modify `frontend/src/api/mobileSummary.ts`: store/read dirty-basket records, preserve added date, compute days in basket, warnings, load progress, and planner selected ids.
- Modify `frontend/src/data/washMateContent.ts`: add `"dirtyBasket"` to `ScreenId`.
- Modify `frontend/src/App.tsx`: route `dirtyBasket`, pass toggle handler to the new screen, remove toggle props from Wardrobe.
- Create `frontend/src/screens/DirtyBasketScreen.tsx`: secondary screen for selecting dirty clothes, showing days in basket and practical advice.
- Modify `frontend/src/screens/TodayScreen.tsx`: show dirty basket on homepage and navigate to the secondary screen.
- Modify `frontend/src/screens/WardrobeScreen.tsx`: remove dirty-basket controls; show categorized wardrobe inventory.
- Modify `frontend/src/styles.css`: add compact dirty-basket screen/category styles.
- Modify tests:
  - `frontend/src/api/mobileSummary.test.ts`
  - `frontend/src/screens/TodayScreen.test.tsx`
  - `frontend/src/screens/WardrobeScreen.test.tsx`
  - create `frontend/src/screens/DirtyBasketScreen.test.tsx`

---

### Task 1: Dirty-Basket Records And Days

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/mobileSummary.ts`
- Test: `frontend/src/api/mobileSummary.test.ts`

- [x] Write failing tests that store dirty-basket records with old `added_at` values and expect `dirty_basket.items[0].days_in_basket` to reflect elapsed days.
- [x] Expect `selected_laundry_item_ids` to remain derived from basket records for planner compatibility.
- [x] Implement `DirtyBasketItem`, extend `DirtyBasketSummary`, and read both legacy string arrays and new record arrays.
- [x] Update `setLaundrySelection` so retained items preserve `added_at` and newly selected items get the current timestamp.
- [x] Run `npm test -- mobileSummary.test.ts`.

### Task 2: Add Dirty Basket Secondary Screen

**Files:**
- Modify: `frontend/src/data/washMateContent.ts`
- Modify: `frontend/src/App.tsx`
- Create: `frontend/src/screens/DirtyBasketScreen.tsx`
- Create: `frontend/src/screens/DirtyBasketScreen.test.tsx`
- Modify: `frontend/src/styles.css`

- [x] Write a failing screen test that renders all wardrobe items, marks selected dirty clothes, displays “已放 N 天”, and toggles an item.
- [x] Add `dirtyBasket` to `ScreenId` and route it under Today.
- [x] Implement `DirtyBasketScreen` with top back bar, summary panel, checklist, days-in-basket labels, and “查看本次方案” CTA.
- [x] Add styles for basket rows, age badges, and summary metrics.
- [x] Run `npm test -- DirtyBasketScreen.test.tsx`.

### Task 3: Move Basket Entry To Today

**Files:**
- Modify: `frontend/src/screens/TodayScreen.tsx`
- Modify: `frontend/src/screens/TodayScreen.test.tsx`

- [x] Write/update tests so Today shows “脏衣篮” summary and a “管理脏衣篮” action that navigates to `dirtyBasket`.
- [x] Remove the copy that says users must go to Wardrobe to select dirty clothes.
- [x] Show concise homepage signals: item count, load percent, oldest days, and warning/recommendation.
- [x] Run `npm test -- TodayScreen.test.tsx`.

### Task 4: Restore Wardrobe As Categorized Inventory

**Files:**
- Modify: `frontend/src/screens/WardrobeScreen.tsx`
- Modify: `frontend/src/screens/WardrobeScreen.test.tsx`

- [x] Write/update tests so Wardrobe no longer contains “脏衣篮”, “加入本次”, or “本次清洗” checkbox text.
- [x] Add category grouping by clothing type: 上衣, 裤装, 床品, 羊毛/特殊护理, 其他.
- [x] Keep add/detail/delete behavior intact.
- [x] Run `npm test -- WardrobeScreen.test.tsx`.

### Task 5: Full Verification

**Files:**
- No production edits expected unless verification exposes a defect.

- [x] Run `npm test`.
- [x] Run `npm run build`.
- [x] Start Vite preview and verify: Today has dirty-basket entry, Dirty Basket selects clothes and shows days, Wardrobe is inventory-only, Laundry Room equal card sizing remains intact.
