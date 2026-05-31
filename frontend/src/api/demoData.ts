/**
 * Demo data seeder — populates localStorage with realistic campus laundry
 * examples so every screen shows meaningful, interactive content.
 *
 * The data models a typical Tsinghua student who:
 *   - lives in 南区21号楼 2层
 *   - has ~14 wardrobe items across 6 categories
 *   - has 5 items in the dirty basket (ready to wash today)
 *   - has 7 days of outfit history with co-occurrence pairs
 *   - allows dryer, budget ¥30, max wait 30 min
 *
 * Call `seedDemoData()` once; it returns the seeded profile so the caller
 * can pass it directly to `saveUserProfile`.
 */

import type { ClothingPair, OutfitLog, WardrobeCategory } from "./types";
import type { UserProfile } from "../userProfile";

// ─── storage keys (must match mobileSummary.ts / outfitLogStore.ts) ──────

const WARDROBE_KEY = "washmate.localWardrobe";
const BASKET_KEY = "washmate.selectedLaundryItemIds";
const PROFILE_KEY = "washmate.userProfile";
const LOGS_KEY = "washmate.outfitLogs";
const PAIRS_KEY = "washmate.clothingPairs";

// ─── public API ──────────────────────────────────────────────────────────

export interface DemoSeedResult {
  profile: UserProfile;
  wardrobeCount: number;
  basketCount: number;
  logCount: number;
  pairCount: number;
}

export function seedDemoData(): DemoSeedResult {
  const wardrobe = buildDemoWardrobe();
  const basketSelections = buildDemoBasketSelections();
  const profile = buildDemoProfile();
  const logs = buildDemoOutfitLogs();
  const pairs = buildDemoClothingPairs();

  localStorage.setItem(WARDROBE_KEY, JSON.stringify(wardrobe));
  localStorage.setItem(BASKET_KEY, JSON.stringify(basketSelections));
  localStorage.setItem(PROFILE_KEY, JSON.stringify(profile));
  localStorage.setItem(LOGS_KEY, JSON.stringify(logs));
  localStorage.setItem(PAIRS_KEY, JSON.stringify(pairs));

  return {
    profile,
    wardrobeCount: wardrobe.length,
    basketCount: basketSelections.length,
    logCount: logs.length,
    pairCount: pairs.length,
  };
}

// ─── demo profile ────────────────────────────────────────────────────────

function buildDemoProfile(): UserProfile {
  return {
    displayName: "小陈",
    dormName: "南区21号楼",
    dormFloor: "2",
    latestPickupTime: "22:30",
    allowDryer: true,
    budgetYuan: 30,
    maxWaitMinutes: 30,
  };
}

// ─── demo wardrobe ───────────────────────────────────────────────────────

interface DemoWardrobeItem {
  item_id: string;
  name: string;
  category: WardrobeCategory;
  user_note: string;
  user_notes: string[];
  wear_count_since_wash: number;
  wash_count: number;
  material_ratios: Record<string, number>;
  colors: string[];
  risks: Record<string, string>;
}

function buildDemoWardrobe(): DemoWardrobeItem[] {
  return [
    // ── 上衣 ──
    {
      item_id: "demo-white-tee",
      name: "白色纯棉短袖",
      category: "上衣",
      user_note: "明天要穿，基础款常穿",
      user_notes: ["明天要穿", "基础款常穿"],
      wear_count_since_wash: 2,
      wash_count: 12,
      material_ratios: { 棉: 1.0 },
      colors: ["白色", "浅色"],
      risks: { color_bleed: "low", shrink: "low" },
    },
    {
      item_id: "demo-black-tee",
      name: "黑色圆领T恤",
      category: "上衣",
      user_note: "和牛仔裤配，一周穿3次",
      user_notes: ["和牛仔裤配，一周穿3次"],
      wear_count_since_wash: 3,
      wash_count: 8,
      material_ratios: { 棉: 0.95, 氨纶: 0.05 },
      colors: ["黑色", "深色"],
      risks: { color_bleed: "high" },
    },
    {
      item_id: "demo-gray-hoodie",
      name: "灰色连帽卫衣",
      category: "上衣",
      user_note: "之前高温烘干后有点缩水，今晚想穿干净的",
      user_notes: ["之前高温烘干后有点缩水", "今晚想穿干净的"],
      wear_count_since_wash: 5,
      wash_count: 3,
      material_ratios: { 棉: 0.8, 聚酯纤维: 0.2 },
      colors: ["灰色", "深色"],
      risks: { shrink: "high", deform: "medium" },
    },
    {
      item_id: "demo-sport-tee",
      name: "运动速干短袖",
      category: "上衣",
      user_note: "运动后及时洗，容易有味道",
      user_notes: ["运动后及时洗", "容易有味道"],
      wear_count_since_wash: 1,
      wash_count: 6,
      material_ratios: { 聚酯纤维: 0.92, 氨纶: 0.08 },
      colors: ["黑色", "深色"],
      risks: { odor: "medium" },
    },
    {
      item_id: "demo-blue-shirt",
      name: "浅蓝牛津纺衬衫",
      category: "上衣",
      user_note: "上课穿，建议挂晾不烘干",
      user_notes: ["上课穿", "建议挂晾不烘干"],
      wear_count_since_wash: 1,
      wash_count: 4,
      material_ratios: { 棉: 1.0 },
      colors: ["蓝色", "浅色"],
      risks: { wrinkle: "medium", shrink: "low" },
    },
    // ── 裤装 ──
    {
      item_id: "demo-black-jeans",
      name: "黑色牛仔裤",
      category: "裤装",
      user_note: "新买的，前几次单独洗防掉色",
      user_notes: ["新买的，前几次单独洗防掉色"],
      wear_count_since_wash: 3,
      wash_count: 2,
      material_ratios: { 牛仔布: 0.98, 氨纶: 0.02 },
      colors: ["黑色", "深色"],
      risks: { color_bleed: "high", shrink: "medium" },
    },
    {
      item_id: "demo-khaki-pants",
      name: "卡其色休闲裤",
      category: "裤装",
      user_note: "日常上课穿，容易皱",
      user_notes: ["日常上课穿", "容易皱"],
      wear_count_since_wash: 2,
      wash_count: 5,
      material_ratios: { 棉: 0.6, 聚酯纤维: 0.4 },
      colors: ["卡其色", "浅色"],
      risks: { wrinkle: "medium" },
    },
    // ── 外套 ──
    {
      item_id: "demo-wool-cardigan",
      name: "米白色羊毛开衫",
      category: "外套",
      user_note: "轻柔处理，不进共享洗衣机",
      user_notes: ["轻柔处理", "不进共享洗衣机"],
      wear_count_since_wash: 4,
      wash_count: 1,
      material_ratios: { 羊毛: 0.9, 尼龙: 0.1 },
      colors: ["白色", "浅色"],
      risks: { shrink: "high", deform: "high", pilling: "medium" },
    },
    {
      item_id: "demo-denim-jacket",
      name: "深蓝牛仔外套",
      category: "外套",
      user_note: "刚买几周，掉色严重",
      user_notes: ["刚买几周，掉色严重"],
      wear_count_since_wash: 6,
      wash_count: 1,
      material_ratios: { 牛仔布: 1.0 },
      colors: ["蓝色", "深色"],
      risks: { color_bleed: "high" },
    },
    // ── 内衣袜子 ──
    {
      item_id: "demo-underwear-set",
      name: "棉质内衣套装",
      category: "内衣袜子",
      user_note: "每天换洗，建议和袜子分开",
      user_notes: ["每天换洗", "建议和袜子分开"],
      wear_count_since_wash: 1,
      wash_count: 20,
      material_ratios: { 棉: 1.0 },
      colors: ["白色", "浅色"],
      risks: { color_bleed: "low" },
    },
    {
      item_id: "demo-sport-socks",
      name: "运动短袜三双",
      category: "内衣袜子",
      user_note: "运动后穿过，有味道",
      user_notes: ["运动后穿过", "有味道"],
      wear_count_since_wash: 2,
      wash_count: 15,
      material_ratios: { 棉: 0.7, 聚酯纤维: 0.3 },
      colors: ["黑色", "深色"],
      risks: { odor: "medium" },
    },
    // ── 床品 ──
    {
      item_id: "demo-bedding",
      name: "白色床单被套",
      category: "床品",
      user_note: "建议大筒或大件模式，两周换一次",
      user_notes: ["建议大筒或大件模式", "两周换一次"],
      wear_count_since_wash: 1,
      wash_count: 8,
      material_ratios: { 棉: 1.0 },
      colors: ["白色", "浅色"],
      risks: { shrink: "low" },
    },
    // ── 鞋包配饰 ──
    {
      item_id: "demo-silk-scarf",
      name: "印花真丝丝巾",
      category: "鞋包配饰",
      user_note: "只能干洗或手洗冷水，不可拧干",
      user_notes: ["只能干洗或手洗冷水", "不可拧干"],
      wear_count_since_wash: 3,
      wash_count: 0,
      material_ratios: { 真丝: 1.0 },
      colors: ["多色", "浅色"],
      risks: { color_bleed: "high", deform: "high", shrink: "high" },
    },
    {
      item_id: "demo-towel",
      name: "浴巾",
      category: "鞋包配饰",
      user_note: "宿舍用，攒几次再洗",
      user_notes: ["宿舍用", "攒几次再洗"],
      wear_count_since_wash: 4,
      wash_count: 10,
      material_ratios: { 棉: 1.0 },
      colors: ["蓝色", "浅色"],
      risks: { odor: "medium" },
    },
  ];
}

// ─── demo basket selections ──────────────────────────────────────────────

interface DirtyBasketRecord {
  item_id: string;
  added_at: string;
  added_at_source: "known";
}

function buildDemoBasketSelections(): DirtyBasketRecord[] {
  const now = new Date();
  const twoDaysAgo = dateAtOffset(now, -2);
  const yesterday = dateAtOffset(now, -1);
  const today = dateAtOffset(now, 0);
  const threeDaysAgo = dateAtOffset(now, -3);

  return [
    // Gray hoodie — urgent (mentioned "今晚想穿干净的")
    { item_id: "demo-gray-hoodie", added_at: twoDaysAgo, added_at_source: "known" },
    // White tee — urgent ("明天要穿")
    { item_id: "demo-white-tee", added_at: yesterday, added_at_source: "known" },
    // Sport tee — odor risk
    { item_id: "demo-sport-tee", added_at: today, added_at_source: "known" },
    // Black jeans — needs separate wash
    { item_id: "demo-black-jeans", added_at: threeDaysAgo, added_at_source: "known" },
    // Bedding — large load, separate from clothes
    { item_id: "demo-bedding", added_at: yesterday, added_at_source: "known" },
  ];
}

// ─── demo outfit logs ────────────────────────────────────────────────────

function buildDemoOutfitLogs(): OutfitLog[] {
  const now = new Date();
  const logs: OutfitLog[] = [];

  // Past 7 days of outfit history
  const outfits: Array<{
    daysAgo: number;
    top_ids: string[];
    bottom_ids: string[];
    outer_ids: string[];
    accessory_ids?: string[];
    temperature: number;
    weather_code: number;
    precipitation: number;
  }> = [
    {
      daysAgo: 0,
      top_ids: ["demo-blue-shirt"],
      bottom_ids: ["demo-khaki-pants"],
      outer_ids: [],
      accessory_ids: ["demo-underwear-set"],
      temperature: 26,
      weather_code: 1,
      precipitation: 0,
    },
    {
      daysAgo: 1,
      top_ids: ["demo-black-tee"],
      bottom_ids: ["demo-black-jeans"],
      outer_ids: ["demo-denim-jacket"],
      accessory_ids: ["demo-underwear-set"],
      temperature: 23,
      weather_code: 3,
      precipitation: 0,
    },
    {
      daysAgo: 2,
      top_ids: ["demo-sport-tee"],
      bottom_ids: ["demo-black-jeans"],
      outer_ids: [],
      accessory_ids: ["demo-underwear-set", "demo-sport-socks"],
      temperature: 28,
      weather_code: 0,
      precipitation: 0,
    },
    {
      daysAgo: 3,
      top_ids: ["demo-white-tee"],
      bottom_ids: ["demo-khaki-pants"],
      outer_ids: ["demo-wool-cardigan"],
      accessory_ids: ["demo-underwear-set"],
      temperature: 20,
      weather_code: 51,
      precipitation: 0.3,
    },
    {
      daysAgo: 4,
      top_ids: ["demo-gray-hoodie"],
      bottom_ids: ["demo-black-jeans"],
      outer_ids: [],
      accessory_ids: ["demo-underwear-set"],
      temperature: 22,
      weather_code: 2,
      precipitation: 0,
    },
    {
      daysAgo: 5,
      top_ids: ["demo-black-tee"],
      bottom_ids: ["demo-khaki-pants"],
      outer_ids: ["demo-denim-jacket"],
      accessory_ids: ["demo-underwear-set"],
      temperature: 21,
      weather_code: 3,
      precipitation: 0,
    },
    {
      daysAgo: 6,
      top_ids: ["demo-sport-tee"],
      bottom_ids: ["demo-black-jeans"],
      outer_ids: [],
      accessory_ids: ["demo-underwear-set", "demo-sport-socks"],
      temperature: 27,
      weather_code: 0,
      precipitation: 0,
    },
  ];

  for (const outfit of outfits) {
    const date = dateAtOffset(now, -outfit.daysAgo);
    logs.push({
      date: date.slice(0, 10),
      top_ids: outfit.top_ids,
      bottom_ids: outfit.bottom_ids,
      outer_ids: outfit.outer_ids,
      accessory_ids: outfit.accessory_ids ?? [],
      weather_snapshot: {
        temperature_2m: outfit.temperature,
        weather_code: outfit.weather_code,
        precipitation: outfit.precipitation,
      },
    });
  }

  return logs;
}

// ─── demo clothing pairs ─────────────────────────────────────────────────

function buildDemoClothingPairs(): ClothingPair[] {
  return [
    // Most worn combos (derived from the 7-day logs above)
    {
      item_a: "demo-black-jeans",
      item_b: "demo-sport-tee",
      co_wear_count: 2,
      pair_type: "top-bottom",
      llm_comment: "运动休闲搭配，黑色系协调",
    },
    {
      item_a: "demo-black-jeans",
      item_b: "demo-black-tee",
      co_wear_count: 1,
      pair_type: "top-bottom",
      llm_comment: "全黑造型",
    },
    {
      item_a: "demo-black-jeans",
      item_b: "demo-gray-hoodie",
      co_wear_count: 1,
      pair_type: "top-bottom",
    },
    {
      item_a: "demo-khaki-pants",
      item_b: "demo-blue-shirt",
      co_wear_count: 1,
      pair_type: "top-bottom",
    },
    {
      item_a: "demo-khaki-pants",
      item_b: "demo-white-tee",
      co_wear_count: 1,
      pair_type: "top-bottom",
    },
    {
      item_a: "demo-denim-jacket",
      item_b: "demo-black-tee",
      co_wear_count: 1,
      pair_type: "outer-top",
    },
    {
      item_a: "demo-wool-cardigan",
      item_b: "demo-white-tee",
      co_wear_count: 1,
      pair_type: "outer-top",
    },
  ];
}

// ─── helpers ─────────────────────────────────────────────────────────────

function dateAtOffset(base: Date, offsetDays: number): string {
  const ms = base.getTime() + offsetDays * 24 * 60 * 60 * 1000;
  const d = new Date(ms);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  const hour = String(d.getHours()).padStart(2, "0");
  const minute = String(d.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day}T${hour}:${minute}:00.000Z`;
}
