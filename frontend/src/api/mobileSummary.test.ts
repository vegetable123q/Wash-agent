import { beforeEach, describe, expect, it, vi } from "vitest";

const filesystemData = vi.hoisted(() => new Map<string, string>());

vi.mock("@capacitor/filesystem", () => ({
  Directory: { Data: "DATA" },
  Filesystem: {
    writeFile: vi.fn(async ({ path, data }: { path: string; data: string }) => {
      filesystemData.set(path, data);
      return { uri: path };
    }),
    readFile: vi.fn(async ({ path }: { path: string }) => {
      const data = filesystemData.get(path);
      if (!data) throw new Error(`Missing file: ${path}`);
      return { data };
    }),
    deleteFile: vi.fn(async ({ path }: { path: string }) => {
      filesystemData.delete(path);
    }),
  },
}));
import {
  clearLaundrySelection,
  clearWardrobeItems,
  createWardrobeItem,
  fetchMobileSummary,
  rebuildMobileSummaryForSelection,
  setLaundrySelection,
  type MobileSummary,
} from "./mobileSummary";
import { PRICING_RULES } from "./pricingRules";

const wardrobeStorageKey = "washmate.localWardrobe";
const dirtyBasketStorageKey = "washmate.selectedLaundryItemIds";

describe("mobileSummary wardrobe selection", () => {
  beforeEach(() => {
    localStorage.clear();
    filesystemData.clear();
    vi.useRealTimers();
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: false,
        status: 503,
        json: async () => ({}),
      }),
    );
  });

  it("starts new users with an empty wardrobe and no selected laundry items", async () => {
    const summary = await fetchMobileSummary();

    expect(summary.wardrobe.items).toEqual([]);
    expect(summary.selected_laundry_item_ids).toEqual([]);
    expect(summary.dirty_basket.item_count).toBe(0);
    expect(summary.dirty_basket.status_label).toBe("空篮");
    expect(summary.plan.buckets).toEqual([]);
    expect(summary.plan.summary).toContain("请选择本次要清洗的衣物");
  });

  it("reports corrupted local wardrobe storage explicitly", async () => {
    localStorage.setItem(wardrobeStorageKey, "{not-json");

    await expect(fetchMobileSummary()).rejects.toThrow("本地衣柜数据无法读取");
  });

  it("keeps shoe washer and provider pricing rules in the mobile summary", async () => {
    const summary = await fetchMobileSummary();

    expect(summary.campus_context.pricing_rules.shoe_washer_programs).toEqual(PRICING_RULES.shoe_washer_programs);
    expect(summary.campus_context.pricing_rules.provider_programs).toEqual(PRICING_RULES.provider_programs);
  });

  it("does not auto-plan recommended items until the user selects this batch", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "tee-1",
          name: "白色棉 T 恤",
          user_note: "明天要穿",
          user_notes: ["明天要穿"],
          wear_count_since_wash: 6,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        },
      ]),
    );

    const summary = await fetchMobileSummary();

    expect(summary.frequency_advice?.[0]?.priority_score).toBeGreaterThanOrEqual(45);
    expect(summary.selected_laundry_item_ids).toEqual([]);
    expect(summary.plan.buckets).toEqual([]);
    expect(summary.plan.summary).toContain("请选择本次要清洗的衣物");
  });

  it("persists explicit laundry selection separately from wardrobe records", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "tee-1",
          name: "白色棉 T 恤",
          user_note: "",
          user_notes: [],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        },
        {
          item_id: "hoodie-1",
          name: "灰色连帽卫衣",
          user_note: "",
          user_notes: [],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 0.8, polyester: 0.2 },
          colors: ["gray"],
          risks: {},
        },
      ]),
    );

    await setLaundrySelection(["hoodie-1"]);
    const summary = await fetchMobileSummary();

    expect(summary.selected_laundry_item_ids).toEqual(["hoodie-1"]);
    expect(summary.dirty_basket).toMatchObject({
      item_count: 1,
      load_percent: 22,
      status_label: "还没满桶",
    });
    expect(summary.dirty_basket.recommendation).toContain("可继续攒");
    expect(summary.wardrobe.items.map((item) => item.item_id)).toEqual(["tee-1", "hoodie-1"]);
  });

  it("clears the dirty basket without deleting wardrobe items", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "tee-1",
          name: "白色棉 T 恤",
          user_note: "",
          user_notes: [],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        },
      ]),
    );
    await setLaundrySelection(["tee-1"]);

    const result = await clearLaundrySelection();
    const summary = await fetchMobileSummary();

    expect(result).toEqual({ status: "cleared", selected_item_ids: [] });
    expect(summary.wardrobe.items.map((item) => item.item_id)).toEqual(["tee-1"]);
    expect(summary.selected_laundry_item_ids).toEqual([]);
    expect(summary.dirty_basket.item_count).toBe(0);
    expect(summary.plan.buckets).toEqual([]);
  });

  it("clears wardrobe items and removes dirty-basket selections", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "tee-1",
          name: "白色棉 T 恤",
          user_note: "",
          user_notes: [],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        },
      ]),
    );
    await setLaundrySelection(["tee-1"]);

    const result = await clearWardrobeItems();
    const summary = await fetchMobileSummary();

    expect(result).toEqual({ status: "cleared", deleted_count: 1 });
    expect(summary.wardrobe.items).toEqual([]);
    expect(summary.selected_laundry_item_ids).toEqual([]);
    expect(summary.dirty_basket.item_count).toBe(0);
    expect(summary.plan.buckets).toEqual([]);
  });

  it("stores uploaded photo thumbnails as local file references outside wardrobe JSON", async () => {
    await createWardrobeItem({
      name: "黑色羽绒服",
      material: "polyester 100%",
      colors: "black",
      note: "冬天穿",
      image_filename: "coat.png",
      category: "外套",
      photo_data_url: "data:image/jpeg;base64,dGh1bWI=",
    });

    const saved = JSON.parse(localStorage.getItem(wardrobeStorageKey) ?? "[]");
    expect(saved[0].photo_data_url).toBeUndefined();
    expect(saved[0].photo_file_path).toMatch(/^wardrobe-photos\/wm-user-.+\.jpg$/);

    const summary = await fetchMobileSummary();

    expect(summary.wardrobe.items[0]).toMatchObject({
      name: "黑色羽绒服",
      category: "外套",
      photo_data_url: "data:image/jpeg;base64,dGh1bWI=",
    });
  });

  it("does not infer a wardrobe category when recognition or user input did not provide one", async () => {
    await createWardrobeItem({
      name: "黑色羽绒服",
      material: "polyester 100%",
      colors: "black",
      note: "",
      image_filename: "coat.png",
    });

    const summary = await fetchMobileSummary();

    expect(summary.wardrobe.items[0].category).toBeUndefined();
  });

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

    const storedItems = JSON.parse(localStorage.getItem(wardrobeStorageKey) ?? "[]");
    expect(storedItems[0]).toMatchObject({
      user_note: "",
      user_notes: [],
      wash_count: 0,
      material_ratios: {},
      colors: [],
      risks: {},
    });
  });

  it("ignores nonnumeric legacy material ratio values", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "legacy-tee",
          name: "legacy tee",
          material_ratios: { cotton: true, wool: "50%" },
        },
      ]),
    );

    const summary = await fetchMobileSummary();

    expect(summary.wardrobe.items[0].material_ratios).toEqual({ wool: 0.5 });
  });

  it("normalizes fractional legacy wardrobe counts to zero", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "legacy-tee",
          name: "legacy tee",
          wear_count_since_wash: 2.5,
          wash_count: 1.5,
        },
      ]),
    );

    const summary = await fetchMobileSummary();

    expect(summary.wardrobe.items[0].wear_count_since_wash).toBe(0);
    expect(summary.wardrobe.items[0].wash_count).toBe(0);
  });

  it("trims legacy stored risk levels before validation", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "legacy-jeans",
          name: "legacy jeans",
          risks: { color_bleed: " High " },
        },
      ]),
    );

    const summary = await fetchMobileSummary();

    expect(summary.wardrobe.items[0].risks.color_bleed).toBe("high");
  });

  it("trims legacy stored risk keys before validation", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "legacy-jeans",
          name: "legacy jeans",
          risks: { " color_bleed ": "high" },
        },
      ]),
    );

    const summary = await fetchMobileSummary();

    expect(summary.wardrobe.items[0].risks).toEqual({ color_bleed: "high" });
  });

  it("ignores nonstring legacy array values", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "legacy-tee",
          name: "legacy tee",
          colors: [" white ", true, 7],
          user_notes: [" keep ", false],
        },
      ]),
    );

    const summary = await fetchMobileSummary();

    expect(summary.wardrobe.items[0].colors).toEqual(["white"]);
    expect(summary.wardrobe.items[0].user_notes).toEqual(["keep"]);
  });

  it("assigns unique wardrobe ids when several items are saved in the same millisecond", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));

    const first = await createWardrobeItem({
      name: "白色棉 T 恤",
      material: "cotton 100%",
      colors: "white",
      note: "",
      image_filename: "tee.png",
    });
    const second = await createWardrobeItem({
      name: "黑色运动短裤",
      material: "polyester 100%",
      colors: "black",
      note: "",
      image_filename: "shorts.png",
    });
    const third = await createWardrobeItem({
      name: "灰色连帽卫衣",
      material: "cotton 80%",
      colors: "gray",
      note: "",
      image_filename: "hoodie.png",
    });

    expect(new Set([first.item.item_id, second.item.item_id, third.item.item_id]).size).toBe(3);
    const summary = await fetchMobileSummary();
    expect(new Set(summary.wardrobe.items.map((item) => item.item_id)).size).toBe(3);
  });

  it("repairs legacy duplicate wardrobe ids before dirty-basket selection", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "dup-item",
          name: "短袖",
          user_note: "",
          user_notes: [],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        },
        {
          item_id: "dup-item",
          name: "短裤",
          user_note: "",
          user_notes: [],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { polyester: 1 },
          colors: ["black"],
          risks: {},
        },
      ]),
    );

    const summary = await fetchMobileSummary();
    const ids = summary.wardrobe.items.map((item) => item.item_id);

    expect(new Set(ids).size).toBe(2);
    expect(ids[0]).toBe("dup-item");
    expect(ids[1]).not.toBe("dup-item");
    expect(JSON.parse(localStorage.getItem(wardrobeStorageKey) ?? "[]").map((item: { item_id: string }) => item.item_id)).toEqual(ids);
  });

  it("remembers how many days each dirty-basket item has been waiting", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "sport-tee-1",
          name: "运动速干短袖",
          user_note: "运动后穿过",
          user_notes: ["运动后穿过"],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { polyester: 1 },
          colors: ["blue"],
          risks: {},
        },
        {
          item_id: "jeans-1",
          name: "黑色牛仔裤",
          user_note: "",
          user_notes: [],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["black"],
          risks: { color_bleed: "high" },
        },
      ]),
    );
    localStorage.setItem(
      dirtyBasketStorageKey,
      JSON.stringify([
        { item_id: "sport-tee-1", added_at: "2026-05-26T08:00:00.000Z" },
        { item_id: "jeans-1", added_at: "2026-05-29T09:00:00.000Z" },
      ]),
    );

    const summary = await fetchMobileSummary();

    expect(summary.selected_laundry_item_ids).toEqual(["sport-tee-1", "jeans-1"]);
    expect(summary.dirty_basket.oldest_days).toBe(3);
    expect(summary.dirty_basket.items.map((item) => [item.item_id, item.days_in_basket])).toEqual([
      ["sport-tee-1", 3],
      ["jeans-1", 0],
    ]);
    expect(summary.dirty_basket.recommendation).toContain("已放 3 天");
  });

  it("does not mark negated sweat notes as hygiene sensitive", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "tee-1",
          name: "白色棉T恤",
          user_note: "没出汗",
          user_notes: ["没出汗"],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        },
      ]),
    );
    localStorage.setItem(
      dirtyBasketStorageKey,
      JSON.stringify([{ item_id: "tee-1", added_at: "2026-05-27T12:00:00.000Z" }]),
    );

    const summary = await fetchMobileSummary();

    expect(summary.dirty_basket.items[0].warning_label).toBe("已放 2 天");
  });

  it("does not mark explicitly not urgent notes as urgent", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "tee-1",
          name: "白色棉T恤",
          user_note: "不急，周末再洗",
          user_notes: ["不急，周末再洗"],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        },
      ]),
    );

    await setLaundrySelection(["tee-1"]);
    const summary = await fetchMobileSummary();

    expect(summary.dirty_basket.urgent_count).toBe(0);
    expect(summary.dirty_basket.status_label).not.toBe("有急用衣物");
  });

  it("uses urgent notes for the dirty-basket status label", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "tee-1",
          name: "白色棉T恤",
          user_note: "今晚急用",
          user_notes: ["今晚急用"],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        },
      ]),
    );

    await setLaundrySelection(["tee-1"]);
    const summary = await fetchMobileSummary();

    expect(summary.dirty_basket.urgent_count).toBe(1);
    expect(summary.dirty_basket.status_label).toBe("有急用衣物");
  });

  it("marks legacy dirty-basket records with an estimated added date", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "tee-1",
          name: "白色棉 T 恤",
          user_note: "",
          user_notes: [],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        },
      ]),
    );
    localStorage.setItem(dirtyBasketStorageKey, JSON.stringify(["tee-1"]));

    const summary = await fetchMobileSummary();

    expect(summary.dirty_basket.items[0]).toMatchObject({
      item_id: "tee-1",
      added_at_source: "estimated",
      days_in_basket: 0,
      warning_label: "加入时间待确认",
    });
    expect(localStorage.getItem(dirtyBasketStorageKey)).toContain("estimated");
  });

  it("preserves existing dirty-basket dates when selection changes", async () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T12:00:00.000Z"));
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "tee-1",
          name: "白色棉 T 恤",
          user_note: "",
          user_notes: [],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        },
        {
          item_id: "hoodie-1",
          name: "灰色连帽卫衣",
          user_note: "",
          user_notes: [],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 0.8 },
          colors: ["gray"],
          risks: {},
        },
      ]),
    );
    localStorage.setItem(
      dirtyBasketStorageKey,
      JSON.stringify([{ item_id: "tee-1", added_at: "2026-05-27T12:00:00.000Z" }]),
    );

    await setLaundrySelection(["tee-1", "hoodie-1"]);
    const summary = await fetchMobileSummary();

    expect(summary.dirty_basket.items.map((item) => [item.item_id, item.days_in_basket])).toEqual([
      ["tee-1", 2],
      ["hoodie-1", 0],
    ]);
  });

  it("rebuilds dirty-basket selection from the current summary without remote fetches", async () => {
    localStorage.setItem(
      wardrobeStorageKey,
      JSON.stringify([
        {
          item_id: "hoodie-1",
          name: "灰色连帽卫衣",
          user_note: "",
          user_notes: [],
          wear_count_since_wash: 1,
          wash_count: 0,
          material_ratios: { cotton: 0.8, polyester: 0.2 },
          colors: ["gray"],
          risks: {},
        },
      ]),
    );
    const summary = await fetchMobileSummary();
    const fetchMock = vi.mocked(fetch);
    fetchMock.mockClear();

    const result = await setLaundrySelection(["hoodie-1"]);
    const updated = rebuildMobileSummaryForSelection(summary, result.selected_item_ids, { allowDryer: false });

    expect(fetchMock).not.toHaveBeenCalled();
    expect(updated.selected_laundry_item_ids).toEqual(["hoodie-1"]);
    expect(updated.dirty_basket).toMatchObject({
      item_count: 1,
      load_percent: 22,
      status_label: "还没满桶",
    });
    expect(updated.plan.summary).not.toContain("请选择本次要清洗的衣物");
  });

  it("estimates dirty-basket capacity from clothing load instead of raw item count", async () => {
    const items = Array.from({ length: 3 }, (_, index) => ({
      item_id: `tee-${index + 1}`,
      name: `白色棉 T 恤 ${index + 1}`,
      user_note: "",
      user_notes: [],
      wear_count_since_wash: 1,
      wash_count: 0,
      material_ratios: { cotton: 1 },
      colors: ["white"],
      risks: {},
    }));
    localStorage.setItem(wardrobeStorageKey, JSON.stringify(items));
    await setLaundrySelection(items.map((item) => item.item_id));

    const summary = await fetchMobileSummary();

    expect(summary.dirty_basket).toMatchObject({
      item_count: 3,
      load_percent: 36,
      status_label: "还没满桶",
    });
    expect(summary.dirty_basket.recommendation).toContain("可继续攒");
  });

  it("preserves planned buckets when no live washer can be reserved", async () => {
    const items = Array.from({ length: 12 }, (_, index) => ({
      item_id: `tee-${index + 1}`,
      name: `白色棉 T 恤 ${index + 1}`,
      user_note: "",
      user_notes: [],
      wear_count_since_wash: 1,
      wash_count: 0,
      material_ratios: { cotton: 1 },
      colors: ["white"],
      risks: {},
    }));
    localStorage.setItem(wardrobeStorageKey, JSON.stringify(items));
    await setLaundrySelection(items.map((item) => item.item_id));

    const summary = await fetchMobileSummary();

    expect(summary.dirty_basket).toMatchObject({
      item_count: 12,
      load_percent: 100,
      status_label: "需要分多桶",
    });
    expect(summary.dirty_basket.estimated_load_count).toBe(2);
    expect(summary.dirty_basket.recommendation).toContain("约 2 桶");
    expect(summary.plan.buckets.length).toBeGreaterThan(0);
    expect(summary.plan.buckets.flatMap((bucket) => bucket.item_ids)).toEqual(items.map((item) => item.item_id));
    expect(summary.plan.buckets.flatMap((bucket) => bucket.warnings)).toContain("没有空闲洗衣机");
    expect(summary.plan.estimated_cost_yuan).toBeNull();
    expect(summary.plan.estimated_duration_minutes).toBeNull();
  });

  it("applies profile budget and wait preferences to regenerated laundry plans", async () => {
    const summary: MobileSummary = {
      source: "backend",
      selected_laundry_item_ids: [],
      dirty_basket: {
        item_count: 0,
        load_percent: 0,
        oldest_days: 0,
        urgent_count: 0,
        status_label: "空篮",
        recommendation: "",
        next_action: "",
        items: [],
      },
      wardrobe: {
        items: [
          {
            item_id: "tee-1",
            name: "白色棉 T 恤",
            user_note: "",
            user_notes: [],
            wear_count_since_wash: 1,
            wash_count: 0,
            material_ratios: { cotton: 1 },
            colors: ["white"],
            risks: {},
          },
        ],
      },
      campus_context: {
        all_machines: [
          {
            machine_id: "washer-1",
            location: "1F",
            machine_type: "standard_washer",
            status: "available",
            remaining_minutes: null,
            price_yuan: 3.5,
            modes: ["standard"],
          },
        ],
        available_machines: [
          {
            machine_id: "washer-1",
            location: "1F",
            machine_type: "standard_washer",
            status: "available",
            remaining_minutes: null,
            price_yuan: 3.5,
            modes: ["standard"],
          },
        ],
        queue_estimates: [
          {
            machine_type: "standard_washer",
            total_count: 1,
            available_count: 1,
            running_count: 0,
            out_of_service_count: 0,
            unknown_count: 0,
            estimated_wait_minutes: 12,
          },
        ],
        weather: {},
        drying_context: { balcony_available: true, ventilation: "normal" },
        pricing_rules: { ...PRICING_RULES },
      },
      plan: {
        buckets: [],
        estimated_cost_yuan: null,
        estimated_duration_minutes: null,
        summary: "",
        global_warnings: [],
      },
      report: {
        title: "",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    };

    const updated = rebuildMobileSummaryForSelection(summary, ["tee-1"], {
      allowDryer: false,
      budgetYuan: 3,
      maxWaitMinutes: 5,
    });

    expect(updated.plan.global_warnings.some((warning) => warning.includes("预算 3 元"))).toBe(true);
    expect(updated.plan.global_warnings.some((warning) => warning.includes("预计等待 12 分钟超过最大等待 5 分钟"))).toBe(true);
  });
});
