/**
 * Mobile summary orchestration — builds the complete in-APK summary by
 * combining wardrobe data, campus context, frequency advice, laundry planning,
 * and report generation. All backend logic runs in TypeScript.
 *
 * Only the ModelHub image recognition requires an external API call
 * with user-provided credentials.
 */

import { buildCampusContextForDorm } from "./campusMachineApi";
import { listCampusTowerOptions } from "./campusTowerDirectory";
import { buildProfileFromInput, storedToPlanItem, type StoredWardrobeItem } from "./clothingExtractor";
import { adviseAllFrequencies } from "./frequencyAdvisor";
import { estimatedWasherLoadCount, loadPercentForItems } from "./laundryLoad";
import { planLaundry } from "./laundryPlanner";
import { DRYING_CONTEXT, PRICING_RULES } from "./pricingRules";
import { generateReport } from "./reportGenerator";
import type {
  BackendMachine,
  BackendQueueEstimate,
  CampusContext,
  CampusContextStatus,
  CampusTowerOption,
  DirtyBasketAddedAtSource,
  DirtyBasketItem,
  DirtyBasketSummary,
  FrequencyAdvice,
  LaundryConstraints,
  LaundryPlan,
  MachineInfo,
  MachineQueueEstimate,
  MobileSummary,
  WardrobeInput,
  WardrobeCategory,
  WardrobeSummaryItem,
  WashReport,
  WeatherSnapshot,
} from "./types";
import { fetchTsinghuaWeather } from "./weatherService";
import type { UserProfile } from "../userProfile";

// ─── public types re-exported for screens ───────────────────────────────

export type { BackendMachine, BackendQueueEstimate, CampusTowerOption, MobileSummary, WardrobeCategory, WardrobeInput, WardrobeSummaryItem };

// ─── wardrobe CRUD ──────────────────────────────────────────────────────

const LOCAL_WARDROBE_STORAGE_KEY = "washmate.localWardrobe";
const LOCAL_LAUNDRY_SELECTION_STORAGE_KEY = "washmate.selectedLaundryItemIds";
const DAY_MS = 24 * 60 * 60 * 1000;
let wardrobeItemIdCounter = 0;

interface DirtyBasketRecord {
  item_id: string;
  added_at: string;
  added_at_source: DirtyBasketAddedAtSource;
}

export async function fetchMobileSummary(profile?: Pick<UserProfile, "dormName" | "allowDryer">): Promise<MobileSummary> {
  return buildIntegratedMobileSummary(profile);
}

export function rebuildMobileSummaryForSelection(
  summary: MobileSummary,
  itemIds: string[],
  profile?: Pick<UserProfile, "allowDryer">,
): MobileSummary {
  const storedItems = summary.wardrobe.items;
  const validIds = new Set(storedItems.map((item) => item.item_id));
  const selectedLaundryItemIds = [...new Set(itemIds.map((id) => id.trim()).filter((id) => validIds.has(id)))];
  const existingRecords = new Map(readDirtyBasketRecords(storedItems).map((record) => [record.item_id, record]));
  const dirtyBasketRecords = selectedLaundryItemIds.map((itemId) =>
    existingRecords.get(itemId) ?? {
      item_id: itemId,
      added_at: new Date().toISOString(),
      added_at_source: "known" as DirtyBasketAddedAtSource,
    },
  );
  writeDirtyBasketRecords(dirtyBasketRecords);

  const selectedSet = new Set(selectedLaundryItemIds);
  const selectedItems = storedItems.filter((item) => selectedSet.has(item.item_id));
  const campusContext = mobileSummaryCampusContextToPlanner(summary.campus_context);
  const { frequencyAdvice, plan, report } = buildLaundryArtifacts(storedItems, selectedLaundryItemIds, campusContext, profile);

  return {
    ...summary,
    selected_laundry_item_ids: selectedLaundryItemIds,
    dirty_basket: buildDirtyBasketSummary(selectedItems, dirtyBasketRecords),
    frequency_advice: frequencyAdvice,
    plan: toMobileLaundryPlan(plan),
    report,
  };
}

export async function createWardrobeItem(input: WardrobeInput): Promise<{ status: string; item: WardrobeSummaryItem }> {
  const name = input.name.trim();
  if (!name) throw new Error("name is required");
  const items = readLocalWardrobeItems();
  const itemId = nextWardrobeItemId(items.map((item) => item.item_id));

  const profile = buildProfileFromInput({
    item_id: itemId,
    name,
    material_text: input.material.trim(),
    colors_text: input.colors.trim(),
    user_note: input.note.trim(),
  });

  const item: WardrobeSummaryItem = {
    item_id: profile.item_id,
    name: profile.name,
    category: normalizeWardrobeCategory(input.category),
    user_note: profile.user_note,
    user_notes: [input.note.trim(), input.image_filename.trim()].filter(Boolean),
    wear_count_since_wash: 0,
    wash_count: 0,
    material_ratios: profile.material_ratios,
    colors: profile.colors,
    risks: Object.fromEntries(
      Object.entries(profile.risks).map(([key, level]) => [key, level]),
    ),
    photo_data_url: validPhotoDataUrl(input.photo_data_url) ? input.photo_data_url : undefined,
  };

  writeLocalWardrobeItems([...items, item]);
  return { status: "created", item };
}

export async function deleteWardrobeItem(itemId: string): Promise<{ status: string; item_id: string }> {
  const normalizedItemId = itemId.trim();
  if (!normalizedItemId) throw new Error("item_id is required");
  const items = readLocalWardrobeItems();
  const nextItems = items.filter((item) => item.item_id !== normalizedItemId);
  if (nextItems.length === items.length) throw new Error(`Unknown wardrobe item: ${normalizedItemId}`);
  writeLocalWardrobeItems(nextItems);
  writeDirtyBasketRecords(readDirtyBasketRecords(nextItems));
  return { status: "deleted", item_id: normalizedItemId };
}

export async function setLaundrySelection(itemIds: string[]): Promise<{ status: string; selected_item_ids: string[] }> {
  const wardrobeItems = readLocalWardrobeItems();
  const validIds = new Set(wardrobeItems.map((item) => item.item_id));
  const existingRecords = new Map(readDirtyBasketRecords(wardrobeItems).map((record) => [record.item_id, record]));
  const selected = [...new Set(itemIds.map((id) => id.trim()).filter(Boolean))]
    .filter((id) => validIds.has(id));
  writeDirtyBasketRecords(selected.map((itemId) => existingRecords.get(itemId) ?? {
    item_id: itemId,
    added_at: new Date().toISOString(),
    added_at_source: "known",
  }));
  return { status: "updated", selected_item_ids: selected };
}

// ─── integrated summary builder ─────────────────────────────────────────

async function buildIntegratedMobileSummary(profile?: Pick<UserProfile, "dormName" | "allowDryer">): Promise<MobileSummary> {
  const storedItems = readLocalWardrobeItems();

  let weather: WeatherSnapshot = await fetchTsinghuaWeather();
  let campusContext: CampusContext;
  let campusStatus: CampusContextStatus;
  const dormName = profile?.dormName?.trim() ?? "";

  if (!dormName) {
    campusContext = emptyCampusContext(weather);
    campusStatus = {
      state: "unconfigured",
      dorm_name: "",
      message: "请先在“我的”选择宿舍楼。",
      updated_at: new Date().toISOString(),
    };
  } else {
    try {
      campusContext = await buildCampusContextForDorm(dormName, {
        weather: weather as unknown as Record<string, unknown>,
        dryingContext: { ...DRYING_CONTEXT },
        pricingRules: campusPricingRules(),
      });
      campusStatus = {
        state: "live",
        dorm_name: dormName,
        message: `已读取 ${campusContext.all_machines.length} 台实时机器记录。`,
        updated_at: new Date().toISOString(),
      };
    } catch (error) {
      campusContext = emptyCampusContext(weather);
      campusStatus = {
        state: "unavailable",
        dorm_name: dormName,
        message: error instanceof Error ? error.message : String(error),
        updated_at: new Date().toISOString(),
      };
    }
  }

  const dirtyBasketRecords = readDirtyBasketRecords(storedItems);
  if (dirtyBasketRecords.length > 0) {
    writeDirtyBasketRecords(dirtyBasketRecords);
  }
  const selectedLaundryItemIds = dirtyBasketRecords.map((record) => record.item_id);
  const selectedItems = storedItems.filter((item) => selectedLaundryItemIds.includes(item.item_id));
  const { frequencyAdvice, plan, report } = buildLaundryArtifacts(storedItems, selectedLaundryItemIds, campusContext, profile);

  // Build the summary for screens
  const allMachines: BackendMachine[] = campusContext.all_machines.map(toBackendMachine);
  const availableMachines: BackendMachine[] = campusContext.available_machines.map(toBackendMachine);

  return {
    source: "backend",
    selected_laundry_item_ids: selectedLaundryItemIds,
    dirty_basket: buildDirtyBasketSummary(selectedItems, dirtyBasketRecords),
    weather,
    campus_towers: listCampusTowerOptions(),
    campus_status: campusStatus,
    wardrobe: { items: storedItems },
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
    plan: toMobileLaundryPlan(plan),
    report,
  };
}

function buildLaundryArtifacts(
  storedItems: WardrobeSummaryItem[],
  selectedLaundryItemIds: string[],
  campusContext: CampusContext,
  profile?: Pick<UserProfile, "allowDryer">,
): { frequencyAdvice: FrequencyAdvice[]; plan: LaundryPlan; report: WashReport } {
  const planItems = storedItems.map(storedToPlanItem);
  const constraints: LaundryConstraints = {
    selected_item_ids: selectedLaundryItemIds,
    urgent_item_ids: [],
    allow_mixed_colors: false,
    allow_dryer: Boolean(profile?.allowDryer),
    hygiene_sensitive: true,
    max_wait_minutes: null,
    budget_yuan: null,
  };
  const frequencyAdvice = adviseAllFrequencies(planItems, constraints);

  if (selectedLaundryItemIds.length === 0) {
    return {
      frequencyAdvice,
      plan: {
        buckets: [],
        estimated_cost_yuan: null,
        estimated_duration_minutes: null,
        summary: "请选择本次要清洗的衣物后生成洗护安排。",
        global_warnings: [],
      },
      report: {
        title: "本次洗护报告",
        sections: {
          "洗衣步骤": "请选择本次要清洗的衣物后生成洗护安排。",
          "费用和时间": "费用待确认。",
          "机器环境": `当前可用洗衣设备 ${campusContext.available_machines.length} 台。`,
          "风险提醒": "本次没有额外风险提醒。",
        },
        savings_notes: [],
        risk_notes: [],
      },
    };
  }

  try {
    const selectedPlanItems = planItems.filter((item) =>
      selectedLaundryItemIds.includes(item.profile.item_id),
    );
    const plan = planLaundry(selectedPlanItems, constraints, campusContext);
    return { frequencyAdvice, plan, report: generateReport(plan, selectedPlanItems, campusContext) };
  } catch {
    return {
      frequencyAdvice,
      plan: {
        buckets: [],
        estimated_cost_yuan: null,
        estimated_duration_minutes: null,
        summary: "当前机器条件不足以生成完整方案，建议稍后刷新。",
        global_warnings: ["未能匹配到可用机器，请检查机器状态或手动选择。"],
      },
      report: {
        title: "本次洗护报告",
        sections: {
          "洗衣步骤": "方案生成需要可用机器，请稍后刷新或手动查看机器状态。",
          "费用和时间": "暂时无法估算。",
          "机器环境": `当前可用洗衣设备 ${campusContext.available_machines.length} 台。`,
          "风险提醒": "未能生成完整方案，请留意深浅色分开洗等基本规则。",
        },
        savings_notes: [],
        risk_notes: [],
      },
    };
  }
}

function toMobileLaundryPlan(plan: LaundryPlan): MobileSummary["plan"] {
  return {
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
  };
}

function emptyCampusContext(weather: WeatherSnapshot): CampusContext {
  return {
    all_machines: [],
    available_machines: [],
    queue_estimates: [],
    weather: weather as unknown as Record<string, unknown>,
    drying_context: { ...DRYING_CONTEXT },
    pricing_rules: campusPricingRules(),
  };
}

function campusPricingRules(): CampusContext["pricing_rules"] {
  return {
    wash_programs: PRICING_RULES.wash_programs,
    dryer_programs: PRICING_RULES.dryer_programs,
  };
}

function mobileSummaryCampusContextToPlanner(context: MobileSummary["campus_context"]): CampusContext {
  const pricingRules = context.pricing_rules as Partial<CampusContext["pricing_rules"]>;
  return {
    all_machines: context.all_machines.map(fromBackendMachine),
    available_machines: context.available_machines.map(fromBackendMachine),
    queue_estimates: context.queue_estimates.map(fromBackendQueueEstimate),
    weather: context.weather,
    drying_context: context.drying_context,
    pricing_rules: {
      wash_programs: pricingRules.wash_programs ?? PRICING_RULES.wash_programs,
      dryer_programs: pricingRules.dryer_programs ?? PRICING_RULES.dryer_programs,
      shoe_washer_programs: pricingRules.shoe_washer_programs,
      provider_programs: pricingRules.provider_programs,
      washer_types: pricingRules.washer_types,
      dryer_modes: pricingRules.dryer_modes,
    },
  };
}

function fromBackendMachine(machine: BackendMachine): MachineInfo {
  return {
    machine_id: machine.machine_id,
    location: machine.location,
    machine_type: machine.machine_type as MachineInfo["machine_type"],
    status: machine.status as MachineInfo["status"],
    remaining_minutes: machine.remaining_minutes,
    price_yuan: machine.price_yuan,
    modes: machine.modes,
    provider: machine.provider,
  };
}

function fromBackendQueueEstimate(estimate: BackendQueueEstimate): MachineQueueEstimate {
  return {
    machine_type: estimate.machine_type as MachineQueueEstimate["machine_type"],
    total_count: estimate.total_count,
    available_count: estimate.available_count,
    running_count: estimate.running_count,
    out_of_service_count: estimate.out_of_service_count,
    unknown_count: estimate.unknown_count,
    estimated_wait_minutes: estimate.estimated_wait_minutes,
  };
}

// ─── local storage ──────────────────────────────────────────────────────

function readLocalWardrobeItems(): WardrobeSummaryItem[] {
  const saved = typeof localStorage === "undefined" ? null : localStorage.getItem(LOCAL_WARDROBE_STORAGE_KEY);
  if (!saved) return [];
  const parsed = JSON.parse(saved) as WardrobeSummaryItem[];
  if (!Array.isArray(parsed)) throw new Error("Invalid local wardrobe data");
  const repaired = repairDuplicateWardrobeItemIds(parsed);
  if (repaired.changed) {
    writeLocalWardrobeItems(repaired.items);
  }
  return repaired.items;
}

function writeLocalWardrobeItems(items: WardrobeSummaryItem[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOCAL_WARDROBE_STORAGE_KEY, JSON.stringify(items));
}

function nextWardrobeItemId(existingIds: Iterable<string>): string {
  const existing = new Set(existingIds);
  let candidate = "";
  do {
    wardrobeItemIdCounter += 1;
    candidate = `wm-user-${Date.now().toString(36)}-${wardrobeItemIdCounter.toString(36)}`;
  } while (existing.has(candidate));
  return candidate;
}

function repairDuplicateWardrobeItemIds(items: WardrobeSummaryItem[]): { items: WardrobeSummaryItem[]; changed: boolean } {
  const seen = new Set<string>();
  let changed = false;
  const repairedItems = items.map((item) => {
    const itemId = String(item.item_id ?? "").trim();
    if (!itemId || seen.has(itemId)) {
      const nextId = nextWardrobeItemId(seen);
      seen.add(nextId);
      changed = true;
      return { ...item, item_id: nextId };
    }
    seen.add(itemId);
    return item;
  });
  return { items: repairedItems, changed };
}

function normalizeWardrobeCategory(value: unknown): WardrobeCategory | undefined {
  const category = typeof value === "string" ? value.trim() : "";
  return wardrobeCategories().includes(category as WardrobeCategory) ? (category as WardrobeCategory) : undefined;
}

function wardrobeCategories(): WardrobeCategory[] {
  return ["上衣", "裤装", "裙装", "外套", "内衣袜子", "床品", "鞋包配饰", "其他"];
}

function validPhotoDataUrl(value: unknown): value is string {
  return typeof value === "string" && /^data:image\/[a-zA-Z0-9.+-]+;base64,/.test(value);
}

function readDirtyBasketRecords(items: WardrobeSummaryItem[]): DirtyBasketRecord[] {
  if (typeof localStorage === "undefined") return [];
  const saved = localStorage.getItem(LOCAL_LAUNDRY_SELECTION_STORAGE_KEY);
  if (!saved) return [];
  const parsed = JSON.parse(saved) as unknown;
  if (!Array.isArray(parsed)) throw new Error("Invalid selected laundry item data");
  const validIds = new Set(items.map((item) => item.item_id));
  const seen = new Set<string>();
  const records: DirtyBasketRecord[] = [];

  for (const entry of parsed) {
    const record = dirtyBasketRecordFromStorage(entry);
    if (!record || !validIds.has(record.item_id) || seen.has(record.item_id)) {
      continue;
    }
    seen.add(record.item_id);
    records.push(record);
  }

  return records;
}

function dirtyBasketRecordFromStorage(value: unknown): DirtyBasketRecord | null {
  if (typeof value === "string") {
    const itemId = value.trim();
    return itemId ? { item_id: itemId, added_at: new Date().toISOString(), added_at_source: "estimated" } : null;
  }
  if (typeof value !== "object" || value === null) {
    return null;
  }
  const raw = value as Partial<DirtyBasketRecord>;
  const itemId = String(raw.item_id ?? "").trim();
  if (!itemId) {
    return null;
  }
  const hasValidAddedAt = validIsoDate(raw.added_at);
  const addedAt = hasValidAddedAt ? String(raw.added_at) : new Date().toISOString();
  const addedAtSource =
    raw.added_at_source === "estimated" || !hasValidAddedAt ? "estimated" : "known";
  return { item_id: itemId, added_at: addedAt, added_at_source: addedAtSource };
}

function validIsoDate(value: unknown): boolean {
  return typeof value === "string" && !Number.isNaN(new Date(value).getTime());
}

function writeDirtyBasketRecords(records: DirtyBasketRecord[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(LOCAL_LAUNDRY_SELECTION_STORAGE_KEY, JSON.stringify(records));
}

function buildDirtyBasketSummary(
  selectedItems: WardrobeSummaryItem[],
  records: DirtyBasketRecord[],
): DirtyBasketSummary {
  const itemCount = selectedItems.length;
  const loadPercent = loadPercentForItems(selectedItems);
  const estimatedLoadCount = estimatedWasherLoadCount(selectedItems);
  const itemMap = new Map(selectedItems.map((item) => [item.item_id, item]));
  const basketItems: DirtyBasketItem[] = records
    .map((record) => {
      const item = itemMap.get(record.item_id);
      if (!item) return null;
      const daysInBasket = daysSince(record.added_at);
      return {
        item_id: item.item_id,
        name: item.name,
        added_at: record.added_at,
        added_at_source: record.added_at_source,
        days_in_basket: daysInBasket,
        warning_label: record.added_at_source === "estimated" ? "加入时间待确认" : dirtyBasketWarningLabel(item, daysInBasket),
      };
    })
    .filter((item): item is DirtyBasketItem => item !== null);
  const oldestDays = Math.max(0, ...basketItems.map((item) => item.days_in_basket));
  const urgentCount = selectedItems.filter(isUrgentItem).length;
  const hasUrgentItem = selectedItems.some((item) =>
    [item.name, item.user_note, ...(item.user_notes ?? [])].join(" ").includes("明天要穿"),
  );

  if (itemCount === 0) {
    return {
      item_count: 0,
      load_percent: 0,
      estimated_load_count: 0,
      oldest_days: 0,
      urgent_count: 0,
      status_label: "空篮",
      recommendation: "先把脏衣服加入脏衣篮，再生成本次洗衣方案。",
      next_action: "去衣柜选择这批要洗的衣物",
      items: [],
    };
  }

  if (oldestDays >= 3) {
    const multipleLoadText = estimatedLoadCount > 1 ? `这批约 ${estimatedLoadCount} 桶，建议分批处理；` : "";
    return {
      item_count: itemCount,
      load_percent: loadPercent,
      estimated_load_count: estimatedLoadCount,
      oldest_days: oldestDays,
      urgent_count: urgentCount,
      status_label: estimatedLoadCount > 1 ? "需要分多桶" : "久放需洗",
      recommendation: `${multipleLoadText}有衣物已放 ${oldestDays} 天，建议今天处理，运动衣、贴身衣物或潮湿衣物不要继续攒。`,
      next_action: "查看本次方案",
      items: basketItems,
    };
  }

  if (estimatedLoadCount > 1) {
    return {
      item_count: itemCount,
      load_percent: loadPercent,
      estimated_load_count: estimatedLoadCount,
      oldest_days: oldestDays,
      urgent_count: urgentCount,
      status_label: "需要分多桶",
      recommendation: `这批脏衣约 ${estimatedLoadCount} 桶，建议按方案分批清洗，避免一次塞太满导致洗不净。`,
      next_action: "查看本次方案",
      items: basketItems,
    };
  }

  if (hasUrgentItem) {
    return {
      item_count: itemCount,
      load_percent: loadPercent,
      estimated_load_count: estimatedLoadCount,
      oldest_days: oldestDays,
      urgent_count: urgentCount,
      status_label: "有急用衣物",
      recommendation: "这批里有明天要穿的衣物，建议今天洗，不必继续等满桶。",
      next_action: "查看本次方案",
      items: basketItems,
    };
  }

  if (loadPercent >= 80) {
    return {
      item_count: itemCount,
      load_percent: loadPercent,
      estimated_load_count: estimatedLoadCount,
      oldest_days: oldestDays,
      urgent_count: urgentCount,
      status_label: "基本够一桶",
      recommendation: "这批脏衣已经接近一桶，可以直接生成方案。",
      next_action: "查看本次方案",
      items: basketItems,
    };
  }

  return {
    item_count: itemCount,
    load_percent: loadPercent,
    estimated_load_count: estimatedLoadCount,
    oldest_days: oldestDays,
    urgent_count: urgentCount,
    status_label: "还没满桶",
    recommendation: "普通衣物可继续攒；运动衣、贴身衣物或潮湿衣物建议别久放。",
    next_action: "继续攒或先洗急用衣物",
    items: basketItems,
  };
}

function daysSince(value: string): number {
  const timestamp = new Date(value).getTime();
  if (Number.isNaN(timestamp)) {
    return 0;
  }
  return Math.max(0, Math.floor((Date.now() - timestamp) / DAY_MS));
}

function dirtyBasketWarningLabel(item: WardrobeSummaryItem, daysInBasket: number): string {
  if (isUrgentItem(item)) {
    return "急用";
  }
  if (daysInBasket >= 2 && isHygieneSensitiveItem(item)) {
    return "久放易有味";
  }
  if (Object.values(item.risks).includes("high")) {
    return "分开洗";
  }
  if (daysInBasket > 0) {
    return `已放 ${daysInBasket} 天`;
  }
  return "刚加入";
}

function isUrgentItem(item: WardrobeSummaryItem): boolean {
  const text = itemSearchText(item);
  return text.includes("明天要穿") || text.includes("急");
}

function isHygieneSensitiveItem(item: WardrobeSummaryItem): boolean {
  const text = itemSearchText(item);
  return ["运动", "速干", "内衣", "贴身", "袜", "出汗", "潮湿", "湿"].some((term) => text.includes(term));
}

function itemSearchText(item: WardrobeSummaryItem): string {
  return [item.name, item.user_note, ...(item.user_notes ?? [])].join(" ").toLowerCase();
}

// ─── type converters ────────────────────────────────────────────────────

function toBackendMachine(m: MachineInfo): BackendMachine {
  return {
    machine_id: m.machine_id,
    location: m.location,
    machine_type: m.machine_type,
    status: m.status,
    remaining_minutes: m.remaining_minutes,
    price_yuan: m.price_yuan,
    modes: m.modes,
    provider: m.provider,
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
