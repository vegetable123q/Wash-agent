# WashMate UX Flow Fixes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the laundry execution, report, outfit, machine-list, profile, and photo-recognition flows understandable after real user actions.

**Architecture:** Keep all behavior inside the existing self-contained React/TypeScript APK frontend. Persist completed laundry records in the local mobile summary service, then let screens consume that explicit state instead of guessing from an emptied dirty basket.

**Tech Stack:** React 18, TypeScript, Vitest, Testing Library, localStorage-backed mobile services.

---

## File Structure

- Modify: `frontend/src/api/types.ts`
  - Add completed-laundry record contracts and include them in `MobileSummary`.
- Modify: `frontend/src/api/mobileSummary.ts`
  - Persist completed laundry records, create execution snapshots before clearing the dirty basket, and expose undo.
- Modify: `frontend/src/api/mobileSummary.test.ts`
  - Cover completed-record persistence, weekly totals, and undo restoration.
- Modify: `frontend/src/App.tsx`
  - Keep last execution result in app state, pass it to the plan screen, and wire undo.
- Modify: `frontend/src/App.integration.test.tsx`
  - Cover executing a plan, seeing the success message, then opening report after dirty-basket clear.
- Modify: `frontend/src/screens/PlanDetailScreen.tsx`
  - Replace confirm-only execution with an inline success/undo panel.
- Modify: `frontend/src/screens/PlanDetailScreen.test.tsx`
  - Assert execution success copy and undo behavior.
- Modify: `frontend/src/screens/ReportScreen.tsx`
  - Add a concise "现在照做" block for active plans and a completed-history report when the current basket is empty.
- Modify: `frontend/src/screens/ReportScreen.test.tsx`
  - Assert concise action copy and weekly completed summary.
- Modify: `frontend/src/screens/OutfitWikiScreen.tsx`
  - Show a friendly missing-bottoms empty state with an "添加下衣" action.
- Create: `frontend/src/screens/OutfitWikiScreen.test.tsx`
  - Cover missing-bottom recommendation copy and action.
- Modify: `frontend/src/screens/LaundryRoomScreen.tsx`
  - Show machine number/ID metadata and highlight plan-recommended machines.
- Modify: `frontend/src/screens/LaundryRoomScreen.test.tsx`
  - Cover machine ID/position line and recommended machine highlight.
- Modify: `frontend/src/screens/ProfileScreen.tsx`
  - Hide ModelHub and demo-data controls inside "高级设置" by default.
- Modify: `frontend/src/screens/ProfileScreen.test.tsx`
  - Cover default simple profile view and expanding advanced settings.
- Modify: `frontend/src/screens/AddClothingScreen.tsx`
  - Move unavailable-recognition reason directly below recognition buttons with a small configure action.
- Modify: `frontend/src/screens/AddClothingScreen.test.tsx`
  - Cover reason/action placement near disabled recognition buttons.
- Modify: `frontend/src/styles.css`
  - Add styles for success panels, report quick-action cards, advanced settings, machine IDs, and recommended machine cards.

---

### Task 1: Completed Laundry Records And Undo

**Files:**
- Modify: `frontend/src/api/types.ts`
- Modify: `frontend/src/api/mobileSummary.ts`
- Modify: `frontend/src/api/mobileSummary.test.ts`

- [ ] **Step 1: Write failing tests for completion history and undo**

Add tests to `frontend/src/api/mobileSummary.test.ts`:

```ts
it("stores a completed laundry record so reports survive dirty-basket clearing", async () => {
  localStorage.setItem(wardrobeStorageKey, JSON.stringify([
    wardrobeItem("tee-1", "白色棉 T 恤", { wear_count_since_wash: 5, wash_count: 1 }),
  ]));
  await setLaundrySelection(["tee-1"]);

  const result = await completeLaundryPlan();
  const summary = await fetchMobileSummary();

  expect(result.record.item_names).toEqual(["白色棉 T 恤"]);
  expect(summary.selected_laundry_item_ids).toEqual([]);
  expect(summary.completed_laundry.weekly_count).toBe(1);
  expect(summary.completed_laundry.recent_records[0]).toMatchObject({
    item_names: ["白色棉 T 恤"],
    completed_item_ids: ["tee-1"],
  });
});

it("undoes the last completed laundry record by restoring counts and dirty basket", async () => {
  localStorage.setItem(wardrobeStorageKey, JSON.stringify([
    wardrobeItem("tee-1", "白色棉 T 恤", { wear_count_since_wash: 5, wash_count: 1 }),
  ]));
  await setLaundrySelection(["tee-1"]);
  const completed = await completeLaundryPlan();

  const undo = await undoCompletedLaundry(completed.record.record_id);
  const summary = await fetchMobileSummary();

  expect(undo.status).toBe("undone");
  expect(summary.selected_laundry_item_ids).toEqual(["tee-1"]);
  expect(summary.wardrobe.items[0]).toMatchObject({ wear_count_since_wash: 5, wash_count: 1 });
  expect(summary.completed_laundry.recent_records).toEqual([]);
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `cd frontend; npm test -- src/api/mobileSummary.test.ts`

Expected: FAIL because `completed_laundry`, `record`, and `undoCompletedLaundry` do not exist yet.

- [ ] **Step 3: Implement completed record contracts**

In `frontend/src/api/types.ts`, add:

```ts
export interface CompletedLaundryItemSnapshot {
  item_id: string;
  wear_count_since_wash: number;
  wash_count: number;
}

export interface CompletedLaundryRecord {
  record_id: string;
  completed_at: string;
  completed_item_ids: string[];
  item_names: string[];
  estimated_cost_yuan: number | null;
  estimated_duration_minutes: number | null;
  machine_labels: string[];
  plan_summary: string;
  before_items: CompletedLaundryItemSnapshot[];
}

export interface CompletedLaundrySummary {
  weekly_count: number;
  weekly_cost_yuan: number | null;
  recent_records: CompletedLaundryRecord[];
}
```

Then add `completed_laundry: CompletedLaundrySummary` to `MobileSummary`.

- [ ] **Step 4: Implement persistence and undo**

In `frontend/src/api/mobileSummary.ts`:

- Add `LOCAL_COMPLETED_LAUNDRY_STORAGE_KEY = "washmate.completedLaundryRecords"`.
- Add helpers `readCompletedLaundryRecords`, `writeCompletedLaundryRecords`, `buildCompletedLaundrySummary`, `completedRecordFromStorage`, and `sameWeek`.
- Change `completeLaundryPlan()` to return `{ status, completed_item_ids, record }`.
- Snapshot selected item names, cost, duration, assigned washer/dryer labels, summary, and before counts before updating counts.
- Write the new record to completed history, then clear dirty basket.
- Export `undoCompletedLaundry(recordId: string)`.
- Undo should remove that record, restore previous item counts for matching IDs, and call `writeDirtyBasketRecords` with restored item IDs.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `cd frontend; npm test -- src/api/mobileSummary.test.ts`

Expected: PASS for the new completed-history and undo tests plus existing mobile summary tests.

---

### Task 2: Plan Execution Success Panel

**Files:**
- Modify: `frontend/src/App.tsx`
- Modify: `frontend/src/screens/PlanDetailScreen.tsx`
- Modify: `frontend/src/screens/PlanDetailScreen.test.tsx`
- Modify: `frontend/src/App.integration.test.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Write failing screen tests**

In `frontend/src/screens/PlanDetailScreen.test.tsx`, add a test that renders `PlanDetailScreen` with a completed result prop and expects:

- `已记录洗涤：白色棉质T恤`
- `洗涤次数 +1`
- `已从脏衣篮移除`
- an `撤销` button

Also update the execution-button test to expect a direct callback result instead of relying only on `window.confirm`.

In `frontend/src/App.integration.test.tsx`, add an end-to-end test that:

- Seeds one selected dirty-basket item.
- Opens the plan.
- Clicks `按此方案执行`.
- Sees the success message.
- Opens `报告`.
- Sees the completed weekly report still present after the dirty basket is empty.

- [ ] **Step 2: Run tests and verify RED**

Run: `cd frontend; npm test -- src/screens/PlanDetailScreen.test.tsx src/App.integration.test.tsx`

Expected: FAIL because the success panel, app execution state, and report history are missing.

- [ ] **Step 3: Wire App execution and undo**

In `frontend/src/App.tsx`:

- Import `undoCompletedLaundry` and the completed execution return type.
- Add `const [lastCompletedLaundry, setLastCompletedLaundry] = useState<CompletedLaundryRecord | null>(null);`
- Change `handleCompleteLaundryPlan` to save the returned record, then refresh.
- Add `handleUndoCompletedLaundry` that calls `undoCompletedLaundry(lastCompletedLaundry.record_id)`, clears the success state, and refreshes.
- Pass `lastCompletedLaundry` and `onUndoCompletePlan` to `PlanDetailScreen`.

- [ ] **Step 4: Render the PlanDetail success panel**

In `frontend/src/screens/PlanDetailScreen.tsx`:

- Add props:
  - `completedRecord?: CompletedLaundryRecord | null`
  - `onUndoCompletePlan?: () => void | Promise<void>`
- If `completedRecord` exists, show a card near the top:
  - heading `已完成本次洗涤`
  - text `已记录洗涤：${item_names.join("、")}`
  - chips `洗涤次数 +1` and `已从脏衣篮移除`
  - secondary `撤销` button when undo is available.

- [ ] **Step 5: Add focused styles**

In `frontend/src/styles.css`, add small classes for `.plan-complete-card` and `.plan-complete-actions`.

- [ ] **Step 6: Run tests and verify GREEN**

Run: `cd frontend; npm test -- src/screens/PlanDetailScreen.test.tsx src/App.integration.test.tsx`

Expected: PASS.

---

### Task 3: Report "现在照做" And Weekly Completed Summary

**Files:**
- Modify: `frontend/src/screens/ReportScreen.tsx`
- Modify: `frontend/src/screens/ReportScreen.test.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Write failing report tests**

In `frontend/src/screens/ReportScreen.test.tsx`, add tests for:

- Active plan quick action: `带：黑色卫衣、牛仔裤、白T；去：6层洗衣机；花：约 ¥11；19:15 开始，22:15 前结束。`
- Empty current basket but completed history: `本周已洗 1 次` and `本周花费 ¥11`.

- [ ] **Step 2: Run tests and verify RED**

Run: `cd frontend; npm test -- src/screens/ReportScreen.test.tsx`

Expected: FAIL because quick-action and completed-history UI do not exist.

- [ ] **Step 3: Implement quick action helpers**

In `frontend/src/screens/ReportScreen.tsx`:

- Add `quickActionText(summary)` for active plan:
  - `带` from selected plan item names.
  - `去` from first assigned washer/dryer machine label.
  - `花` from total cost when finite.
  - `时间` from current local time plus total duration when finite.
- Add fallback completed-history report:
  - When no active plan but `completed_laundry.recent_records.length > 0`, show weekly count/cost and latest completed item names.

- [ ] **Step 4: Style quick report cards**

In `frontend/src/styles.css`, add `.report-now-card` and `.report-weekly-card`.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `cd frontend; npm test -- src/screens/ReportScreen.test.tsx`

Expected: PASS.

---

### Task 4: Outfit Missing-Bottom Empty State

**Files:**
- Modify: `frontend/src/screens/OutfitWikiScreen.tsx`
- Create: `frontend/src/screens/OutfitWikiScreen.test.tsx`

- [ ] **Step 1: Write failing OutfitWiki screen test**

Create `frontend/src/screens/OutfitWikiScreen.test.tsx`:

```ts
it("explains missing bottoms directly in the recommendation area", async () => {
  const onNavigate = vi.fn();
  render(
    <OutfitWikiScreen
      wardrobeItems={[wardrobeItem("top-1", "白色 T 恤", "上衣")]}
      onNavigate={onNavigate}
    />,
  );

  expect(await screen.findByText("缺少裤装/裙装，暂时无法推荐完整穿搭。")).toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "添加下衣" }));
  expect(onNavigate).toHaveBeenCalledWith("addClothing");
});
```

- [ ] **Step 2: Run test and verify RED**

Run: `cd frontend; npm test -- src/screens/OutfitWikiScreen.test.tsx`

Expected: FAIL because the recommendation area still says `正在生成推荐…`.

- [ ] **Step 3: Implement explicit wardrobe readiness state**

In `frontend/src/screens/OutfitWikiScreen.tsx`:

- Use `classifyWardrobeItems` result before the recommendation card.
- If `wardrobeItems.length > 0 && bottoms.length === 0`, render a friendly empty card:
  - heading `还缺下衣`
  - text `缺少裤装/裙装，暂时无法推荐完整穿搭。`
  - secondary button `添加下衣` that navigates to `addClothing`.
- Keep existing empty wardrobe and recommendation states unchanged.

- [ ] **Step 4: Run test and verify GREEN**

Run: `cd frontend; npm test -- src/screens/OutfitWikiScreen.test.tsx`

Expected: PASS.

---

### Task 5: Machine List Position Clues And Recommendation Highlight

**Files:**
- Modify: `frontend/src/screens/LaundryRoomScreen.tsx`
- Modify: `frontend/src/screens/LaundryRoomScreen.test.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Write failing machine-list tests**

In `frontend/src/screens/LaundryRoomScreen.test.tsx`, add or update tests to assert:

- machine cards include `设备 455514` or a short physical clue;
- a machine assigned by `mobileSummary.plan.buckets[].machine_id` shows `推荐使用`;
- recommended cards have class `machine-card-recommended`.

- [ ] **Step 2: Run tests and verify RED**

Run: `cd frontend; npm test -- src/screens/LaundryRoomScreen.test.tsx`

Expected: FAIL because IDs are hidden and recommended machines are not highlighted.

- [ ] **Step 3: Implement machine metadata and recommended IDs**

In `frontend/src/screens/LaundryRoomScreen.tsx`:

- Compute recommended machine IDs from wash buckets and drying steps.
- Add a `recommended` boolean per machine.
- Include `设备 ${machine.machine_id}` in the submeta line.
- If recommended, set `accent="purple"`, add class `machine-card-recommended`, and show a `推荐使用` chip.

- [ ] **Step 4: Style recommendation highlight**

In `frontend/src/styles.css`, add `.machine-card-recommended` with a subtle purple outline/background that does not change card size.

- [ ] **Step 5: Run tests and verify GREEN**

Run: `cd frontend; npm test -- src/screens/LaundryRoomScreen.test.tsx`

Expected: PASS.

---

### Task 6: Advanced Settings And Recognition Reason Placement

**Files:**
- Modify: `frontend/src/screens/ProfileScreen.tsx`
- Modify: `frontend/src/screens/ProfileScreen.test.tsx`
- Modify: `frontend/src/screens/AddClothingScreen.tsx`
- Modify: `frontend/src/screens/AddClothingScreen.test.tsx`
- Modify: `frontend/src/styles.css`

- [ ] **Step 1: Write failing tests**

In `frontend/src/screens/ProfileScreen.test.tsx`, add:

- By default, `ModelHub baseUrl`, `apikey`, and `加载演示数据` are not visible.
- Clicking `高级设置` reveals `识图模型` and `演示数据`.

In `frontend/src/screens/AddClothingScreen.test.tsx`, add:

- The disabled `拍照识别` button is immediately followed by `需要先在“我的”配置识图模型`.
- The nearby `去配置` button calls `onConfigureModelHub`.

- [ ] **Step 2: Run tests and verify RED**

Run: `cd frontend; npm test -- src/screens/ProfileScreen.test.tsx src/screens/AddClothingScreen.test.tsx`

Expected: FAIL because advanced settings are visible by default and the recognition reason copy is farther down.

- [ ] **Step 3: Hide developer-facing settings under advanced**

In `frontend/src/screens/ProfileScreen.tsx`:

- Add `showAdvanced` state.
- Render a `高级设置` secondary button after the basic profile form.
- Move the ModelHub form and demo-data section inside the advanced block.
- Keep default page focused on dorm, floor, budget, latest pickup, and drying preference.

- [ ] **Step 4: Move recognition unavailable reason near buttons**

In `frontend/src/screens/AddClothingScreen.tsx`:

- Add a small reusable `MissingModelHubHint`.
- Render it directly below single-photo, text, and batch recognition buttons when ModelHub config is missing.
- Use copy `需要先在“我的”配置识图模型`.
- Include a compact `去配置` secondary button when `onConfigureModelHub` exists.
- Remove the later duplicate full-width warning for non-batch modes.

- [ ] **Step 5: Add styles**

In `frontend/src/styles.css`, add `.advanced-settings`, `.recognition-config-hint`, and compact action layout styles.

- [ ] **Step 6: Run tests and verify GREEN**

Run: `cd frontend; npm test -- src/screens/ProfileScreen.test.tsx src/screens/AddClothingScreen.test.tsx`

Expected: PASS.

---

### Task 7: Final Verification

**Files:**
- No new files beyond tasks above.

- [ ] **Step 1: Run focused frontend screen/API tests**

Run:

```bash
cd frontend
npm test -- src/api/mobileSummary.test.ts src/screens/PlanDetailScreen.test.tsx src/screens/ReportScreen.test.tsx src/screens/OutfitWikiScreen.test.tsx src/screens/LaundryRoomScreen.test.tsx src/screens/ProfileScreen.test.tsx src/screens/AddClothingScreen.test.tsx src/App.integration.test.tsx
```

Expected: PASS.

- [ ] **Step 2: Run full frontend test suite**

Run: `cd frontend; npm test`

Expected: PASS.

- [ ] **Step 3: Run build**

Run: `cd frontend; npm run build`

Expected: PASS.

- [ ] **Step 4: Inspect diff**

Run: `git status --short` and `git diff -- frontend/src docs/superpowers/plans/2026-05-31-washmate-ux-flow-fixes.md`

Expected: Only intended plan, frontend API, screen, test, and style changes.
