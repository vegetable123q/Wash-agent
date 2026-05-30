# Honor Non-Machine Wash And Light Colors Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Prevent clothes marked as non-machine-wash from entering washer buckets, and classify common light colors such as light blue and silver into light-color buckets.

**Architecture:** Keep the decision logic in the existing laundry planners. Add canonical `do_not_machine_wash`/`不可机洗` terms to the hand-wash path, expand explicit light/dark color terms, and mirror the same behavior in the frontend TypeScript planner and backend Python reference planner.

**Tech Stack:** TypeScript, Vitest, Python unittest, `npm`, `uv`.

---

### Task 1: Frontend Planner Regression Coverage

**Files:**
- Modify: `frontend/src/api/laundryPlanner.test.ts`

- [x] **Step 1: Add a non-machine-wash regression test**

Add this test inside `describe("planLaundry", ...)` or near the hand-wash regression tests:

```ts
it("keeps do_not_machine_wash items out of machine-wash buckets", () => {
  const jacket: WardrobeItemForPlan = {
    profile: {
      item_id: "silver-jacket",
      name: "银色机能风多口袋外套",
      user_note: "洗涤方式：不可机洗；建议冷水轻柔手洗。",
      material_ratios: { polyester: 1 },
      colors: ["银色"],
      care_warnings: ["do_not_machine_wash"],
      care_recommendations: [],
      care_forbidden: ["do_not_machine_wash"],
      care_symbols: {},
      risks: { deform: "high" },
      recommended_wash: "hand_wash",
    },
    wear_count_since_wash: 1,
    preferred_method: "machine_wash",
    user_notes: ["不可机洗"],
  };

  const plan = planLaundry([jacket], {
    selected_item_ids: ["silver-jacket"],
    urgent_item_ids: [],
    allow_mixed_colors: false,
    allow_dryer: false,
    hygiene_sensitive: true,
    max_wait_minutes: null,
    budget_yuan: null,
  }, context);

  expect(plan.buckets).toHaveLength(1);
  expect(plan.buckets[0]).toMatchObject({
    bucket_id: "hand-wash",
    wash_method: "hand_wash",
    machine_id: undefined,
  });
  expect(plan.buckets[0].warnings.join(" ")).toContain("不进入共享洗衣机");
});
```

- [x] **Step 2: Add a light-color regression test**

Add this test near the existing color bucket tests:

```ts
it("classifies light blue and silver as light-standard instead of defaulting to dark", () => {
  const items: WardrobeItemForPlan[] = [
    standardItem("light-blue-jeans", "浅蓝色牛仔裤", ["浅蓝色"]),
    standardItem("silver-socks", "银色袜子", ["银色"]),
  ];

  const plan = planLaundry(items, {
    selected_item_ids: ["light-blue-jeans", "silver-socks"],
    urgent_item_ids: [],
    allow_mixed_colors: false,
    allow_dryer: false,
    hygiene_sensitive: false,
    max_wait_minutes: null,
    budget_yuan: null,
  }, context);

  expect(plan.buckets).toHaveLength(1);
  expect(plan.buckets[0].bucket_id).toBe("light-standard");
  expect(plan.buckets[0].item_ids).toEqual(["light-blue-jeans", "silver-socks"]);
});
```

If the file does not already have a compact item factory, add a local helper rather than refactoring existing tests.

- [x] **Step 3: Run frontend target test and confirm failure**

Run from `frontend`:

```bash
npm test -- src/api/laundryPlanner.test.ts
```

Expected: FAIL because `do_not_machine_wash` is not recognized by the planner and `浅蓝色`/`银色` are not light color terms yet.

### Task 2: Frontend Planner Implementation

**Files:**
- Modify: `frontend/src/api/laundryPlanner.ts`
- Modify: `frontend/src/api/laundryPlanner.test.ts`

- [x] **Step 1: Add non-machine-wash terms**

Add a new term set near the existing care term constants:

```ts
const DO_NOT_MACHINE_WASH_TERMS = new Set([
  "do_not_machine_wash",
  "no_machine_wash",
  "no machine wash",
  "do not machine wash",
  "不可机洗",
  "不能机洗",
  "不建议机洗",
]);
```

Then include it in the existing hand-wash bucket condition:

```ts
containsAny(text, DO_NOT_MACHINE_WASH_TERMS)
```

- [x] **Step 2: Expand explicit color terms**

Extend `DARK_COLOR_TERMS` and `LIGHT_COLOR_TERMS` without adding broad ambiguous terms such as plain `蓝色`:

```ts
const DARK_COLOR_TERMS = new Set([
  "black", "dark", "navy", "indigo", "deep blue", "dark blue", "charcoal",
  "深色", "黑", "藏青", "靛蓝", "深蓝", "深灰", "炭灰", "墨绿", "酒红", "深棕", "棕色", "咖啡色",
]);
const LIGHT_COLOR_TERMS = new Set([
  "white", "light", "gray", "grey", "light blue", "sky blue", "silver", "beige", "cream", "ivory", "pastel",
  "浅色", "白", "灰", "浅灰", "浅蓝", "淡蓝", "天蓝", "银色", "米色", "奶油色", "象牙白",
  "浅粉", "浅黄", "浅绿", "浅紫", "浅卡其",
]);
```

- [x] **Step 3: Run frontend target test**

Run from `frontend`:

```bash
npm test -- src/api/laundryPlanner.test.ts
```

Expected: PASS.

### Task 3: Backend Reference Planner Regression Coverage

**Files:**
- Modify: `tests/test_e_module.py`

- [x] **Step 1: Add backend non-machine-wash regression test**

Add this test near the existing planner regression tests:

```py
def test_do_not_machine_wash_item_goes_to_hand_wash(self) -> None:
    jacket = _item(
        "silver-jacket",
        "银色机能风多口袋外套",
        colors=["银色"],
        materials={"polyester": 1.0},
        risks={"deform": RiskLevel.HIGH},
        warnings=["do_not_machine_wash"],
    )
    jacket.profile.user_note = "洗涤方式：不可机洗；建议冷水轻柔手洗。"

    plan = plan_laundry(
        [jacket],
        LaundryConstraints(selected_item_ids=["silver-jacket"], allow_dryer=False),
        _campus_context(),
    )

    self.assertEqual(plan.buckets[0].bucket_id, "hand-wash")
    self.assertEqual(plan.buckets[0].wash_method, WashMethod.HAND_WASH)
    self.assertFalse(plan.buckets[0].machine_id)
```

- [x] **Step 2: Add backend light-color regression test**

Add this test near `test_unknown_color_defaults_to_dark_standard`:

```py
def test_light_blue_and_silver_items_go_to_light_standard(self) -> None:
    items = [
        _item("light-blue-jeans", "浅蓝色牛仔裤", colors=["浅蓝色"], materials={"cotton": 0.98, "elastane": 0.02}),
        _item("silver-socks", "银色袜子", colors=["银色"], materials={"cotton": 1.0}),
    ]

    plan = plan_laundry(
        items,
        LaundryConstraints(selected_item_ids=["light-blue-jeans", "silver-socks"], allow_dryer=False),
        _campus_context(),
    )

    self.assertEqual(len(plan.buckets), 1)
    self.assertEqual(plan.buckets[0].bucket_id, "light-standard")
    self.assertEqual(plan.buckets[0].item_ids, ["light-blue-jeans", "silver-socks"])
```

- [x] **Step 3: Run backend target tests and confirm failure**

Run from repo root:

```bash
uv run python -m unittest tests.test_e_module.EModuleTests -v
```

Expected: FAIL on the new cases before implementation.

### Task 4: Backend Reference Planner Implementation

**Files:**
- Modify: `backend/laundry/planner.py`

- [x] **Step 1: Mirror frontend care and color term changes**

Add `_DO_NOT_MACHINE_WASH_TERMS`, expand `_DARK_COLOR_TERMS` and `_LIGHT_COLOR_TERMS`, and include `_DO_NOT_MACHINE_WASH_TERMS` in `_bucket_id_for()` before machine-wash bucket selection.

- [x] **Step 2: Run backend target tests**

Run from repo root:

```bash
uv run python -m unittest tests.test_e_module.EModuleTests -v
```

Expected: PASS.

### Task 5: Final Verification And Handoff

**Files:**
- Modify: `docs/superpowers/plans/2026-05-30-honor-non-machine-wash-and-light-colors.md`

- [x] **Step 1: Run focused frontend test**

Run from `frontend`:

```bash
npm test -- src/api/laundryPlanner.test.ts
```

Expected: PASS.

- [x] **Step 2: Run frontend build**

Run from `frontend`:

```bash
npm run build
```

Expected: PASS.

- [x] **Step 3: Run diff whitespace check**

Run from repo root:

```bash
git diff --check
```

Expected: no whitespace errors.

- [x] **Step 4: Mark this plan complete**

Update every completed checkbox in this plan from `[ ]` to `[x]`. Do not create a git commit unless the user explicitly asks for one.
