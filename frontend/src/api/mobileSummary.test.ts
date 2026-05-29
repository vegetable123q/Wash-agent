import { beforeEach, describe, expect, it, vi } from "vitest";
import { createWardrobeItem, fetchMobileSummary, setLaundrySelection } from "./mobileSummary";

const wardrobeStorageKey = "washmate.localWardrobe";
const dirtyBasketStorageKey = "washmate.selectedLaundryItemIds";

describe("mobileSummary wardrobe selection", () => {
  beforeEach(() => {
    localStorage.clear();
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
      load_percent: 30,
      status_label: "还没满桶",
    });
    expect(summary.dirty_basket.recommendation).toContain("可继续攒");
    expect(summary.wardrobe.items.map((item) => item.item_id)).toEqual(["tee-1", "hoodie-1"]);
  });

  it("persists wardrobe category and uploaded photo data for inventory display", async () => {
    await createWardrobeItem({
      name: "黑色羽绒服",
      material: "polyester 100%",
      colors: "black",
      note: "冬天穿",
      image_filename: "coat.png",
      category: "外套",
      photo_data_url: "data:image/png;base64,Y29hdA==",
    });

    const summary = await fetchMobileSummary();

    expect(summary.wardrobe.items[0]).toMatchObject({
      name: "黑色羽绒服",
      category: "外套",
      photo_data_url: "data:image/png;base64,Y29hdA==",
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
});
