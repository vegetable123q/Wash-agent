import { describe, expect, it } from "vitest";
import { classifyWardrobeItems, fallbackRecommendation, filterAvailableItems, generateStyleSummary } from "./outfitWiki";
import type { WardrobeSummaryItem } from "./mobileSummary";
import type { ClothingPair, OutfitLog } from "./types";

function makeItem(overrides: Partial<WardrobeSummaryItem> & { item_id: string; name: string }): WardrobeSummaryItem {
  return {
    wear_count_since_wash: 0,
    wash_count: 0,
    material_ratios: {},
    colors: [],
    risks: {},
    ...overrides,
  };
}

describe("classifyWardrobeItems", () => {
  it("classifies by category field", () => {
    const items = [
      makeItem({ item_id: "1", name: "白T", category: "上衣" }),
      makeItem({ item_id: "2", name: "黑裤", category: "裤装" }),
      makeItem({ item_id: "3", name: "风衣", category: "外套" }),
    ];
    const { tops, bottoms, outers } = classifyWardrobeItems(items);
    expect(tops).toHaveLength(1);
    expect(bottoms).toHaveLength(1);
    expect(outers).toHaveLength(1);
  });

  it("falls back to name inference for missing category", () => {
    const items = [
      makeItem({ item_id: "1", name: "短袖T恤" }),
      makeItem({ item_id: "2", name: "牛仔裤" }),
      makeItem({ item_id: "3", name: "羽绒服" }),
      makeItem({ item_id: "4", name: "连衣裙", category: "裙装" }),
    ];
    const { tops, bottoms, outers } = classifyWardrobeItems(items);
    expect(tops).toHaveLength(1);
    expect(bottoms.length).toBeGreaterThanOrEqual(1);
    expect(outers).toHaveLength(1);
  });

  it("returns empty arrays for empty input", () => {
    const result = classifyWardrobeItems([]);
    expect(result.tops).toEqual([]);
    expect(result.bottoms).toEqual([]);
    expect(result.outers).toEqual([]);
  });
});

describe("filterAvailableItems", () => {
  const items = [
    makeItem({ item_id: "top-1", name: "白T", category: "上衣" }),
    makeItem({ item_id: "top-2", name: "脏T", category: "上衣" }),
    makeItem({ item_id: "top-3", name: "旧T", category: "上衣", wear_count_since_wash: 6 }),
    makeItem({ item_id: "bottom-1", name: "黑裤", category: "裤装" }),
  ];

  it("returns all items when no dirty list", () => {
    const result = filterAvailableItems(items);
    // top-3 has wear_count >= 5, so excluded
    expect(result).toHaveLength(3);
  });

  it("excludes items in dirty basket", () => {
    const result = filterAvailableItems(items, ["top-2"]);
    // top-2 (dirty) + top-3 (high wear) excluded
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.item_id)).not.toContain("top-2");
  });

  it("excludes items with wear count >= 5", () => {
    const result = filterAvailableItems(items);
    expect(result.map((i) => i.item_id)).not.toContain("top-3");
  });

  it("excludes both dirty and high-wear items", () => {
    const result = filterAvailableItems(items, ["top-2"]);
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.item_id)).toEqual(["top-1", "bottom-1"]);
  });
});

describe("fallbackRecommendation", () => {
  it("returns low-confidence when no tops or bottoms", () => {
    const rec = fallbackRecommendation([], undefined, [], []);
    expect(rec.confidence).toBe("low");
    expect(rec.match_score).toBe(0);
    expect(rec.top_ids).toEqual([]);
  });

  it("picks items avoiding recent wear", () => {
    const items = [
      makeItem({ item_id: "top-1", name: "白T", category: "上衣" }),
      makeItem({ item_id: "top-2", name: "蓝衬衫", category: "上衣" }),
      makeItem({ item_id: "bottom-1", name: "黑裤", category: "裤装" }),
      makeItem({ item_id: "bottom-2", name: "牛仔裤", category: "裤装" }),
    ];
    const recentLogs: OutfitLog[] = [
      { date: "2026-05-29", top_ids: ["top-1"], bottom_ids: ["bottom-1"], outer_ids: [], accessory_ids: [] },
    ];
    const rec = fallbackRecommendation(items, undefined, recentLogs, []);
    expect(rec.top_ids[0]).toBe("top-2");
    expect(rec.bottom_ids[0]).toBe("bottom-2");
  });

  it("reuses items when all are recently worn", () => {
    const items = [
      makeItem({ item_id: "top-1", name: "白T", category: "上衣" }),
      makeItem({ item_id: "bottom-1", name: "黑裤", category: "裤装" }),
    ];
    const recentLogs: OutfitLog[] = [
      { date: "2026-05-29", top_ids: ["top-1"], bottom_ids: ["bottom-1"], outer_ids: [], accessory_ids: [] },
      { date: "2026-05-28", top_ids: ["top-1"], bottom_ids: ["bottom-1"], outer_ids: [], accessory_ids: [] },
    ];
    const rec = fallbackRecommendation(items, undefined, recentLogs, []);
    expect(rec.top_ids).toEqual(["top-1"]);
    expect(rec.bottom_ids).toEqual(["bottom-1"]);
  });

  it("suggests outer when temperature is cold", () => {
    const items = [
      makeItem({ item_id: "top-1", name: "白T", category: "上衣" }),
      makeItem({ item_id: "bottom-1", name: "黑裤", category: "裤装" }),
      makeItem({ item_id: "outer-1", name: "羽绒", category: "外套" }),
    ];
    const weather = {
      source: "open-meteo",
      status: "live" as const,
      current: { temperature_2m: 10, relative_humidity_2m: 50, precipitation: 0 },
    };
    const rec = fallbackRecommendation(items, weather, [], []);
    expect(rec.outer_ids).toContain("outer-1");
  });

  it("boosts match_score for pairs with co-wear history", () => {
    const items = [
      makeItem({ item_id: "top-1", name: "白T", category: "上衣" }),
      makeItem({ item_id: "bottom-1", name: "黑裤", category: "裤装" }),
    ];
    const pairs: ClothingPair[] = [
      { item_a: "top-1", item_b: "bottom-1", co_wear_count: 5, pair_type: "top-bottom" },
    ];
    const rec = fallbackRecommendation(items, undefined, [], pairs);
    expect(rec.match_score).toBeGreaterThan(60);
  });

  it("excludes dirty items from recommendation", () => {
    const items = [
      makeItem({ item_id: "top-1", name: "白T", category: "上衣" }),
      makeItem({ item_id: "top-2", name: "蓝衬衫", category: "上衣" }),
      makeItem({ item_id: "bottom-1", name: "黑裤", category: "裤装" }),
    ];
    // top-1 is in dirty basket → should recommend top-2 instead
    const rec = fallbackRecommendation(items, undefined, [], [], ["top-1"]);
    expect(rec.top_ids).not.toContain("top-1");
    expect(rec.top_ids).toContain("top-2");
  });

  it("returns low-confidence when all items are dirty or worn out", () => {
    const items = [
      makeItem({ item_id: "top-1", name: "脏T", category: "上衣" }),
      makeItem({ item_id: "bottom-1", name: "旧裤", category: "裤装", wear_count_since_wash: 7 }),
    ];
    const rec = fallbackRecommendation(items, undefined, [], [], ["top-1"]);
    expect(rec.confidence).toBe("low");
    expect(rec.match_score).toBe(0);
  });
});

describe("generateStyleSummary", () => {
  it("returns fallback when no logs", async () => {
    const result = await generateStyleSummary(
      [],
      [],
      [],
      { baseUrl: "", apikey: "", model_name: "" },
    );
    expect(result.source).toBe("fallback");
    expect(result.text).toContain("还没有穿搭记录");
  });

  it("returns fallback summary with data", async () => {
    const items = [
      makeItem({ item_id: "top-1", name: "白T", category: "上衣" }),
      makeItem({ item_id: "bottom-1", name: "黑裤", category: "裤装" }),
    ];
    const logs: OutfitLog[] = [
      { date: "2026-05-30", top_ids: ["top-1"], bottom_ids: ["bottom-1"], outer_ids: [], accessory_ids: [] },
      { date: "2026-05-29", top_ids: ["top-1"], bottom_ids: ["bottom-1"], outer_ids: [], accessory_ids: [] },
    ];
    const result = await generateStyleSummary(
      logs,
      items,
      [],
      { baseUrl: "", apikey: "", model_name: "" },
    );
    expect(result.source).toBe("fallback");
    expect(result.text).toContain("白T");
    expect(result.text).toContain("黑裤");
  });
});
