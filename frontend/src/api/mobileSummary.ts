/**
 * Mobile summary orchestration — builds the complete in-APK summary by
 * combining wardrobe data, campus context, frequency advice, laundry planning,
 * and report generation. All backend logic runs in TypeScript.
 *
 * Only the ModelHub image recognition requires an external API call
 * with user-provided credentials.
 */

import { buildCampusContext, fetchCampusContext, type MachineInfo, machineInfoFromView } from "./campusContext";
import { buildProfileFromInput, storedToPlanItem, type StoredWardrobeItem } from "./clothingExtractor";
import { adviseAllFrequencies, recommendedItemIds } from "./frequencyAdvisor";
import { planLaundry } from "./laundryPlanner";
import { CAMPUS_TOWERS } from "./pricingRules";
import { generateReport } from "./reportGenerator";
import type {
  BackendMachine,
  BackendQueueEstimate,
  CampusTower,
  LaundryConstraints,
  LaundryPlan,
  MobileSummary,
  WardrobeInput,
  WardrobeSummaryItem,
  WashReport,
  WeatherSnapshot,
} from "./types";
import { machines, wardrobeItems } from "../data/washMateContent";
import type { MachineView, WardrobeItemView } from "../data/washMateContent";

// ─── public types re-exported for screens ───────────────────────────────

export type { BackendMachine, BackendQueueEstimate, CampusTower, MobileSummary, WardrobeInput, WardrobeSummaryItem };

// ─── wardrobe CRUD ──────────────────────────────────────────────────────

const LOCAL_WARDROBE_STORAGE_KEY = "washmate.localWardrobe";

export async function fetchMobileSummary(): Promise<MobileSummary> {
  return buildIntegratedMobileSummary();
}

export async function createWardrobeItem(input: WardrobeInput): Promise<{ status: string; item: WardrobeSummaryItem }> {
  const name = input.name.trim();
  if (!name) throw new Error("name is required");

  const profile = buildProfileFromInput({
    item_id: `wm-user-${Date.now().toString(36)}`,
    name,
    material_text: input.material.trim(),
    colors_text: input.colors.trim(),
    user_note: input.note.trim(),
  });

  const item: WardrobeSummaryItem = {
    item_id: profile.item_id,
    name: profile.name,
    user_note: profile.user_note,
    user_notes: [input.note.trim(), input.image_filename.trim()].filter(Boolean),
    wear_count_since_wash: 0,
    wash_count: 0,
    material_ratios: profile.material_ratios,
    colors: profile.colors,
    risks: Object.fromEntries(
      Object.entries(profile.risks).map(([key, level]) => [key, level]),
    ),
  };

  const items = [...readLocalWardrobeItems(), item];
  writeLocalWardrobeItems(items);
  return { status: "created", item };
}

export async function deleteWardrobeItem(itemId: string): Promise<{ status: string; item_id: string }> {
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) throw new Error("item_id is required");
  const items = readLocalWardrobeItems();
  const nextItems = items.filter((item) => item.item_id !== normalizedItemId);
  if (nextItems.length === items.length) throw new Error(`Unknown wardrobe item: ${normalizedItemId}`);
  writeLocalWardrobeItems(nextItems);
  return { status: "deleted", item_id: normalizedItemId };
}

// ─── integrated summary builder ─────────────────────────────────────────

async function buildIntegratedMobileSummary(): Promise<MobileSummary> {
  const wardrobeItems = readLocalWardrobeItems();

  // Try to get live weather; fall back gracefully
  let weather: WeatherSnapshot;
  let campusContext: ReturnType<typeof buildCampusContext>;
  try {
    const result = await fetchCampusContext();
    weather = result.weather;
    campusContext = result.context;
  } catch {
    weather = { source: "in-apk", status: "unavailable", error: "天气获取失败，使用默认上下文" };
    campusContext = buildCampusContext(weather);
  }

  // Convert stored items to planner-compatible items
  const planItems = wardrobeItems.map(storedToPlanItem);

  // Build constraints — auto-select items recommended for washing
  const constraints: LaundryConstraints = {
    selected_item_ids: [],
    urgent_item_ids: [],
    allow_mixed_colors: false,
    allow_dryer: false,
    hygiene_sensitive: true,
    max_wait_minutes: null,
    budget_yuan: null,
  };

  // Get frequency advice for all items
  const frequencyAdvice = adviseAllFrequencies(planItems, constraints);
  const recommendedIds = recommendedItemIds(planItems, constraints, 45);
  constraints.selected_item_ids = recommendedIds;

  // Plan laundry for recommended items
  let plan: LaundryPlan;
  let report: WashReport;

  if (recommendedIds.length === 0) {
    // No items recommended for washing — produce empty plan
    plan = {
      buckets: [],
      estimated_cost_yuan: 0,
      estimated_duration_minutes: 0,
      summary: "当前没有需要优先清洗的衣物。",
      global_warnings: [],
    };
    report = {
      title: "本次校园洗衣方案",
      sections: {
        "洗衣步骤": "当前衣柜中没有达到清洗阈值的衣物，可暂缓洗衣。",
        "费用和时间": "预计费用 0 元。",
        "机器环境": `当前可用机器记录 ${campusContext.available_machines.length} 台。`,
        "风险提醒": "本次没有额外风险提醒。",
      },
      savings_notes: [],
      risk_notes: [],
    };
  } else {
    try {
      const selectedPlanItems = planItems.filter((item) =>
        recommendedIds.includes(item.profile.item_id),
      );
      plan = planLaundry(selectedPlanItems, constraints, campusContext);
      report = generateReport(plan, selectedPlanItems, campusContext);
    } catch {
      // Planner may fail if no matching machines; fall back to basic info
      plan = {
        buckets: [],
        estimated_cost_yuan: null,
        estimated_duration_minutes: null,
        summary: "当前机器条件不足以生成完整方案，建议稍后刷新。",
        global_warnings: ["未能匹配到可用机器，请检查机器状态或手动选择。"],
      };
      report = {
        title: "本次校园洗衣方案",
        sections: {
          "洗衣步骤": "方案生成需要可用机器，请稍后刷新或手动查看机器状态。",
          "费用和时间": "暂时无法估算。",
          "机器环境": `当前可用机器记录 ${campusContext.available_machines.length} 台。`,
          "风险提醒": "未能生成完整方案，请留意深浅色分开洗等基本规则。",
        },
        savings_notes: [],
        risk_notes: [],
      };
    }
  }

  // Build the summary for screens
  const allMachines: BackendMachine[] = campusContext.all_machines.map(toBackendMachine);
  const availableMachines: BackendMachine[] = campusContext.available_machines.map(toBackendMachine);

  return {
    source: "backend",
    weather,
    campus_towers: CAMPUS_TOWERS,
    wardrobe: { items: wardrobeItems },
    frequency_advice: frequencyAdvice,
    campus_context: {
      all_machines: allMachines,
      available_machines: availableMachines,
      queue_estimates: campusContext.queue_estimates.map(toBackendQueueEstimate),
      weather: campusContext.weather,
      drying_context: campusContext.drying_context,
      pricing_rules: {
        wash_programs: campusContext.pricing_rules.wash_programs,
        dryer_programs: campusContext.pricing_rules.dryer_programs,
        source: "integrated",
      },
    },
    plan: {
      buckets: plan.buckets.map((b) => ({
        bucket_id: b.bucket_id,
        item_ids: b.item_ids,
        wash_method: b.wash_method,
        machine_type: b.machine_type,
        program: b.program,
        detergent_ml: b.detergent_ml,
        use_laundry_bag: b.use_laundry_bag,
        dry_method: b.dry_method,
        warnings: b.warnings,
      })),
      estimated_cost_yuan: plan.estimated_cost_yuan,
      estimated_duration_minutes: plan.estimated_duration_minutes,
      summary: plan.summary,
      global_warnings: plan.global_warnings,
    },
    report,
  };
}

// ─── local storage ──────────────────────────────────────────────────────

function readLocalWardrobeItems(): WardrobeSummaryItem[] {
  const saved = typeof localStorage === "undefined" ? null : localStorage.getItem(LOCAL_WARDROBE_STORAGE_KEY);
  if (!saved) return initialWardrobeItems();
  const parsed = JSON.parse(saved) as WardrobeSummaryItem[];
  if (!Array.isArray(parsed)) throw new Error("Invalid local wardrobe data");
  return parsed;
}

function writeLocalWardrobeItems(items: WardrobeSummaryItem[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOCAL_WARDROBE_STORAGE_KEY, JSON.stringify(items));
}

function initialWardrobeItems(): WardrobeSummaryItem[] {
  return wardrobeItems.slice(0, 4).map((item) => ({
    item_id: item.id,
    name: item.name,
    user_note: item.description,
    user_notes: [item.description],
    wear_count_since_wash: item.wearCount,
    wash_count: item.washCount,
    material_ratios: materialRatiosFromStatic(item.material),
    colors: colorsFromStatic(item),
    risks: risksFromStatic(item.riskLevel),
  }));
}

function materialRatiosFromStatic(value: string): Record<string, number> {
  const percentMatch = value.match(/^(.+?)\s*(\d+)%$/);
  if (percentMatch) return { [percentMatch[1].trim().toLowerCase()]: Number(percentMatch[2]) / 100 };
  return value ? { [value.toLowerCase()]: 1 } : {};
}

function colorsFromStatic(item: { name: string }): string[] {
  if (item.name.includes("白")) return ["white"];
  if (item.name.includes("黑")) return ["black"];
  if (item.name.includes("灰")) return ["gray"];
  return [];
}

function risksFromStatic(level: string): Record<string, string> {
  if (level === "高") return { shrink: "high", color_bleed: "high" };
  if (level === "中") return { general: "medium" };
  return {};
}

// ─── type converters ────────────────────────────────────────────────────

function toBackendMachine(m: MachineInfo): BackendMachine {
  return {
    machine_id: m.machine_id,
    location: m.location,
    machine_type: m.machine_type,
    status: m.status,
    capacity_kg: m.capacity_kg,
    remaining_minutes: m.remaining_minutes,
    price_yuan: m.price_yuan,
    modes: m.modes,
  };
}

function toBackendQueueEstimate(e: { machine_type: string; total_count: number; available_count: number; running_count: number; out_of_service_count: number; unknown_count: number; estimated_wait_minutes: number | null }): BackendQueueEstimate {
  return {
    machine_type: e.machine_type,
    total_count: e.total_count,
    available_count: e.available_count,
    running_count: e.running_count,
    out_of_service_count: e.out_of_service_count,
    unknown_count: e.unknown_count,
    estimated_wait_minutes: e.estimated_wait_minutes,
  };
}
