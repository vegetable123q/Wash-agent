# WashMate UX Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix three observed UX issues from the latest WashMate Campus smoke test: raw machine identifiers in user-facing flows, conflicting ModelHub warnings after manual saves, and missing wardrobe-memory actions on clothing detail.

**Architecture:** Keep changes local to the existing React/TypeScript mobile app. Add focused regression tests first, then make the smallest production changes in the existing API and screen components. Avoid backend Python changes because the primary UI is self-contained in `frontend/`.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library.

---

## File Structure

- Modify: `frontend/src/api/laundryPlanner.ts`
  - Build machine recommendation warnings from user-facing location/type labels, without raw provider machine ids unless the location already contains a physical machine number.
- Modify: `frontend/src/api/laundryPlanner.test.ts`
  - Regression coverage for hiding raw ids in generated recommendation warnings.
- Modify: `frontend/src/screens/LaundryRoomScreen.tsx`
  - Replace machine-list "设备编号 <raw id>" metadata with user-facing floor/status/program context.
- Modify: `frontend/src/screens/LaundryRoomScreen.test.tsx`
  - Regression coverage that laundry room cards do not render raw provider ids.
- Modify: `frontend/src/screens/AddClothingScreen.tsx`
  - Show missing ModelHub configuration only while recognition is relevant, not after a manual save.
- Modify: `frontend/src/screens/AddClothingScreen.test.tsx`
  - Regression coverage that manual save success is not paired with the ModelHub error message.
- Modify: `frontend/src/api/mobileSummary.ts`
  - Add a small local wardrobe mutation for recording one wear count.
- Modify: `frontend/src/api/mobileSummary.test.ts`
  - Regression coverage that wear count increments persist and reject unknown ids.
- Modify: `frontend/src/screens/ClothingDetailScreen.tsx`
  - Add "记录穿着" and "加入脏衣篮" actions for backend wardrobe items.
- Modify: `frontend/src/screens/ClothingDetailScreen.test.tsx`
  - Regression coverage for the new action buttons and disabled state when already in basket.
- Modify: `frontend/src/App.tsx`
  - Wire clothing-detail actions to local storage APIs and summary refresh/rebuild.

---

### Task 1: Hide Raw Machine Ids From User-Facing Machine Copy

**Files:**
- Modify: `frontend/src/api/laundryPlanner.test.ts`
- Modify: `frontend/src/api/laundryPlanner.ts`
- Modify: `frontend/src/screens/LaundryRoomScreen.test.tsx`
- Modify: `frontend/src/screens/LaundryRoomScreen.tsx`

- [x] **Step 1: Write failing planner regression test**

Add a test near the existing floor-preference test:

```ts
expect(plan.global_warnings.join("\n")).toContain("推荐使用南区21号楼六层洗衣机，程序标准洗。");
expect(plan.global_warnings.join("\n")).not.toContain("sixth-floor");
```

- [x] **Step 2: Run planner test and verify it fails**

Run: `npm test -- src/api/laundryPlanner.test.ts`

Expected: FAIL because the current warning contains `sixth-floor`.

- [x] **Step 3: Implement minimal planner copy fix**

Change `machineRecommendationWarning` so fallback labels use `${location}${machineTypeLabel(...)}` instead of `${machine.machine_id} 号...`.

- [x] **Step 4: Write failing laundry-room regression test**

In `LaundryRoomScreen.test.tsx`, assert the rendered text does not include provider ids like `455514`, `wm10003112`, or `764255`, and does include a user-facing status/floor/program metadata line.

- [x] **Step 5: Run laundry-room test and verify it fails**

Run: `npm test -- src/screens/LaundryRoomScreen.test.tsx`

Expected: FAIL because current cards render `设备编号 455514`.

- [x] **Step 6: Implement minimal laundry-room card metadata fix**

Replace the machine id paragraph with a helper such as `machineCardMeta(machine)` that renders status/remaining time/modes without `machine.machine_id`.

- [x] **Step 7: Verify Task 1**

Run:

```powershell
npm test -- src/api/laundryPlanner.test.ts src/screens/LaundryRoomScreen.test.tsx
```

Expected: PASS.

---

### Task 2: Remove Conflicting ModelHub Warning After Manual Save

**Files:**
- Modify: `frontend/src/screens/AddClothingScreen.test.tsx`
- Modify: `frontend/src/screens/AddClothingScreen.tsx`

- [x] **Step 1: Write failing regression test**

Extend the manual-save test to assert:

```ts
expect(screen.queryByText("识图需要先在“我的”页面输入 ModelHub baseUrl 和 apikey")).not.toBeInTheDocument();
```

after `保存成功，已加入衣柜` appears.

- [x] **Step 2: Run test and verify it fails**

Run: `npm test -- src/screens/AddClothingScreen.test.tsx`

Expected: FAIL because the warning is always rendered when ModelHub config is incomplete.

- [x] **Step 3: Implement minimal form-state fix**

Introduce a display guard like:

```ts
const showMissingModelHubConfig = !hasModelHubConfig && status !== "saved";
```

Use it for single/text form warnings. Preserve batch-mode warning before recognition because batch mode requires ModelHub.

- [x] **Step 4: Verify Task 2**

Run: `npm test -- src/screens/AddClothingScreen.test.tsx`

Expected: PASS.

---

### Task 3: Add Wardrobe Memory Actions To Clothing Detail

**Files:**
- Modify: `frontend/src/api/mobileSummary.test.ts`
- Modify: `frontend/src/api/mobileSummary.ts`
- Modify: `frontend/src/screens/ClothingDetailScreen.test.tsx`
- Modify: `frontend/src/screens/ClothingDetailScreen.tsx`
- Modify: `frontend/src/App.tsx`

- [x] **Step 1: Write failing API tests**

Add tests for `recordWardrobeWear(itemId)`:

```ts
const result = await recordWardrobeWear("tee-1");
expect(result).toEqual({ status: "updated", item_id: "tee-1", wear_count_since_wash: 3 });
await expect(recordWardrobeWear("missing")).rejects.toThrow("Unknown wardrobe item: missing");
```

- [x] **Step 2: Run API test and verify it fails**

Run: `npm test -- src/api/mobileSummary.test.ts`

Expected: FAIL because `recordWardrobeWear` is not exported.

- [x] **Step 3: Implement minimal API mutation**

Read local wardrobe items, find the requested item, increment `wear_count_since_wash`, write the updated list, and return the new count. Preserve existing normalization and explicit unknown-id errors.

- [x] **Step 4: Write failing clothing-detail tests**

Add tests that backend detail renders enabled `记录穿着` and `加入脏衣篮` buttons, calls the supplied callbacks with the item id, and disables the basket button when `isInDirtyBasket` is true.

- [x] **Step 5: Run clothing-detail test and verify it fails**

Run: `npm test -- src/screens/ClothingDetailScreen.test.tsx`

Expected: FAIL because the buttons/props do not exist.

- [x] **Step 6: Implement detail actions and App wiring**

Add optional props:

```ts
onRecordWear?: (itemId: string) => void | Promise<void>;
onAddToBasket?: (itemId: string) => void | Promise<void>;
isInDirtyBasket?: boolean;
```

Render two action buttons only for backend items. In `App.tsx`, import `recordWardrobeWear`, call it then `refreshMobileSummary`, and add current item to `setLaundrySelection` followed by `rebuildMobileSummaryForSelection`.

- [x] **Step 7: Verify Task 3**

Run:

```powershell
npm test -- src/api/mobileSummary.test.ts src/screens/ClothingDetailScreen.test.tsx
```

Expected: PASS.

---

## Final Verification

- [x] Run focused frontend tests:

```powershell
npm test -- src/api/laundryPlanner.test.ts src/screens/LaundryRoomScreen.test.tsx src/screens/AddClothingScreen.test.tsx src/api/mobileSummary.test.ts src/screens/ClothingDetailScreen.test.tsx
```

- [x] Run full frontend tests:

```powershell
npm test
```

- [x] Run production build:

```powershell
npm run build
```

- [x] Check git status:

```powershell
git status --short --branch
```

Expected: only intentional files above are modified/added.
