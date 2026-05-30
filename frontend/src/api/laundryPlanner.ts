/**
 * Laundry decision and bucket planning.
 * Ported from backend/laundry/planner.py so the APK is self-contained.
 */

import type {
  CampusContext,
  DryMethod,
  LaundryBucket,
  LaundryConstraints,
  LaundryPlan,
  MachineInfo,
  MachineStatus,
  MachineType,
  RiskLevel,
  WardrobeItemForPlan,
  WashMethod,
} from "./types";
import { splitItemsByLaundryLoad } from "./laundryLoad";

// ─── constants ──────────────────────────────────────────────────────────

const DARK_COLOR_TERMS = new Set(["black", "dark", "navy", "indigo", "深色", "黑", "藏青", "靛蓝"]);
const LIGHT_COLOR_TERMS = new Set(["white", "light", "gray", "grey", "浅色", "白", "灰"]);
const BEDDING_TERMS = new Set(["bedding", "sheet", "duvet", "床单", "被套", "床品"]);
const WOOL_TERMS = new Set(["wool", "羊毛", "cashmere", "羊绒"]);
const HAND_WASH_TERMS = new Set(["hand_wash_only", "hand wash only", "只能手洗", "手洗"]);
const DRY_CLEAN_TERMS = new Set(["dry_clean_only", "dry clean only", "只能干洗", "干洗"]);
const DO_NOT_WASH_TERMS = new Set(["do_not_wash", "不可水洗", "不能水洗"]);
const DO_NOT_DRY_TERMS = new Set(["do_not_tumble_dry", "do_not_dry", "不可烘干", "不能烘干"]);
const HIGH_DRY_RISK_KEYS = new Set(["shrink", "deform", "dryer_damage"]);

const HAND_WASH_DETERGENT_ML_PER_ITEM = 8.0;
const STANDARD_DETERGENT_ML_BASE = 18.0;
const STANDARD_DETERGENT_ML_PER_ITEM = 6.0;
const LARGE_DETERGENT_ML_BASE = 32.0;
const LARGE_DETERGENT_ML_PER_ITEM = 8.0;

const BUCKET_ORDER = ["do-not-wash", "dry-clean", "hand-wash", "large-bedding", "dark-standard", "light-standard", "mixed-standard"];

// ─── main entry ─────────────────────────────────────────────────────────

export function planLaundry(
  items: WardrobeItemForPlan[],
  constraints: LaundryConstraints,
  campusContext: CampusContext,
): LaundryPlan {
  validateUniqueItemIds(items);
  const selected = selectedItems(items, constraints.selected_item_ids);
  const bucketInputs = splitBucketInputs(selected, constraints);
  const buckets = bucketInputs.map(({ bucketId, baseBucketId, items: bucketItems }) =>
    buildBucket(bucketId, baseBucketId, bucketItems, constraints, campusContext),
  );

  const estimatedCost = estimateCost(buckets, campusContext);
  const estimatedDuration = estimateDuration(buckets, campusContext);
  const globalWarnings = buildGlobalWarnings(buckets, constraints, estimatedCost, campusContext);

  return {
    buckets,
    estimated_cost_yuan: estimatedCost,
    estimated_duration_minutes: estimatedDuration,
    summary: `本次共 ${buckets.length} 个洗护批次，已按容量、颜色、材质、床品和高风险衣物分开处理。`,
    global_warnings: globalWarnings,
  };
}

// ─── item selection ─────────────────────────────────────────────────────

function validateUniqueItemIds(items: WardrobeItemForPlan[]): void {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const item of items) {
    const itemId = item.profile.item_id;
    if (seen.has(itemId)) {
      duplicates.push(itemId);
      continue;
    }
    seen.add(itemId);
  }
  if (duplicates.length) {
    throw new Error(`items duplicate item_id: ${dedupe(duplicates).join(", ")}`);
  }
}

function selectedItems(items: WardrobeItemForPlan[], ids: string[]): WardrobeItemForPlan[] {
  const uniqueIds = [...new Set(ids.map((id) => id.trim()).filter(Boolean))];
  if (!uniqueIds.length) {
    throw new Error("selected_item_ids is required for laundry planning");
  }
  const byId = new Map(items.map((item) => [item.profile.item_id, item]));
  const missing = uniqueIds.filter((id) => !byId.has(id));
  if (missing.length) {
    throw new Error(`selected item ids not found: ${missing.join(", ")}`);
  }
  return uniqueIds.map((id) => byId.get(id)!);
}

// ─── bucket splitting ───────────────────────────────────────────────────

interface BucketInput {
  bucketId: string;
  baseBucketId: string;
  items: WardrobeItemForPlan[];
}

function splitBucketInputs(items: WardrobeItemForPlan[], constraints: LaundryConstraints): BucketInput[] {
  const groups = new Map<string, WardrobeItemForPlan[]>();
  for (const item of items) {
    const bucketId = bucketIdFor(item, constraints);
    if (!groups.has(bucketId)) groups.set(bucketId, []);
    groups.get(bucketId)!.push(item);
  }
  return BUCKET_ORDER.filter((id) => groups.has(id)).flatMap((baseBucketId) => {
    const chunks = splitItemsByLaundryLoad(groups.get(baseBucketId)!);
    return chunks.map((chunk, index) => ({
      bucketId: chunks.length > 1 ? `${baseBucketId}-${index + 1}` : baseBucketId,
      baseBucketId,
      items: chunk,
    }));
  });
}

function bucketIdFor(item: WardrobeItemForPlan, constraints: LaundryConstraints): string {
  const text = searchText(item);
  if (item.preferred_method === "do_not_wash" || containsAny(text, DO_NOT_WASH_TERMS)) return "do-not-wash";
  if (item.preferred_method === "dry_clean" || containsAny(text, DRY_CLEAN_TERMS)) return "dry-clean";
  if (
    item.preferred_method === "hand_wash" ||
    containsAny(text, HAND_WASH_TERMS) ||
    hasMaterial(item, WOOL_TERMS) ||
    hasHighRisk(item, new Set(["shrink", "deform"]))
  ) {
    return "hand-wash";
  }
  if (containsAny(text, BEDDING_TERMS)) return "large-bedding";
  const hasColorBleedRisk = hasHighRisk(item, new Set(["color_bleed"]));
  if (containsAny(text, DARK_COLOR_TERMS) || hasColorBleedRisk) {
    if (constraints.allow_mixed_colors && !hasColorBleedRisk) return "mixed-standard";
    return "dark-standard";
  }
  if (containsAny(text, LIGHT_COLOR_TERMS)) return constraints.allow_mixed_colors ? "mixed-standard" : "light-standard";
  return "dark-standard"; // default: treat unknown as dark for safety
}

// ─── bucket building ────────────────────────────────────────────────────

function buildBucket(
  bucketId: string,
  baseBucketId: string,
  items: WardrobeItemForPlan[],
  constraints: LaundryConstraints,
  context: CampusContext,
): LaundryBucket {
  if (baseBucketId === "do-not-wash") {
    return {
      bucket_id: bucketId,
      item_ids: itemIds(items),
      wash_method: "do_not_wash",
      machine_type: "unknown",
      program: "",
      detergent_ml: null,
      use_laundry_bag: false,
      dry_method: "do_not_dry",
      warnings: ["该批次含不可水洗衣物，不进入本次水洗流程。"],
    };
  }

  if (baseBucketId === "dry-clean") {
    return {
      bucket_id: bucketId,
      item_ids: itemIds(items),
      wash_method: "dry_clean",
      machine_type: "unknown",
      program: "",
      detergent_ml: null,
      use_laundry_bag: false,
      dry_method: "do_not_dry",
      warnings: ["该批次建议送专业干洗，不进入共享洗衣机。"],
    };
  }

  if (baseBucketId === "hand-wash") {
    return {
      bucket_id: bucketId,
      item_ids: itemIds(items),
      wash_method: "hand_wash",
      machine_type: "unknown",
      program: "",
      detergent_ml: detergentMl(baseBucketId, items),
      use_laundry_bag: true,
      dry_method: "air_dry",
      warnings: handWashWarnings(items, context),
    };
  }

  const program = baseBucketId === "large-bedding" ? "large" : "standard";
  const machineType: MachineType = "standard_washer";
  const machine = requireAvailableMachine(context.available_machines, machineType, program);
  requireWashProgram(context, program);

  const [dryMethod, dryWarnings] = dryingDecision(items, constraints, context);
  const warnings = [
    ...machineBucketWarnings(baseBucketId, items),
    ...capacityBucketWarnings(bucketId, baseBucketId),
    machineRecommendationWarning(machine, program),
    ...dryWarnings,
  ];

  return {
    bucket_id: bucketId,
    item_ids: itemIds(items),
    wash_method: "machine_wash",
    machine_type: machineType,
    program,
    detergent_ml: detergentMl(baseBucketId, items),
    use_laundry_bag: baseBucketId === "dark-standard" || constraints.hygiene_sensitive || anyRecommendsBag(items),
    dry_method: dryMethod,
    warnings: dedupe(warnings),
  };
}

// ─── drying decision ────────────────────────────────────────────────────

function dryingDecision(
  items: WardrobeItemForPlan[],
  constraints: LaundryConstraints,
  context: CampusContext,
): [DryMethod, string[]] {
  if (!constraints.allow_dryer) {
    return ["air_dry", ["用户未允许烘干，本批次自然晾干。", ...airDryContextWarnings(context)]];
  }

  const unsafe = items.filter(dryerUnsafe).map((item) => item.profile.name);
  if (unsafe.length) {
    return [
      "air_dry",
      [`${unsafe.join("、")} 不可烘干或存在高温损伤风险，改为自然晾干。`, ...airDryContextWarnings(context)],
    ];
  }

  const dryer = findAvailableMachine(context.available_machines, "dryer", "low");
  if (!dryer) {
    return ["air_dry", ["当前没有可用烘干机，改为自然晾干。", ...airDryContextWarnings(context)]];
  }
  requireDryerProgram(context, "low");
  return ["low_heat_dryer", [machineRecommendationWarning(dryer, "low")]];
}

// ─── cost and duration ──────────────────────────────────────────────────

function estimateCost(buckets: LaundryBucket[], context: CampusContext): number {
  let total = 0;
  for (const bucket of buckets) {
    if (bucket.wash_method === "machine_wash") {
      total += washProgramValue(context, bucket.program, "price_yuan");
    }
    if (bucket.dry_method === "low_heat_dryer") {
      total += dryerProgramValue(context, "low", "price_yuan");
    }
  }
  return Math.round(total * 100) / 100;
}

function estimateDuration(buckets: LaundryBucket[], context: CampusContext): number {
  let total = 0;
  for (const bucket of buckets) {
    if (bucket.wash_method === "machine_wash") {
      total += Math.round(washProgramValue(context, bucket.program, "duration_minutes"));
    }
    if (bucket.dry_method === "low_heat_dryer") {
      total += Math.round(dryerProgramValue(context, "low", "duration_minutes"));
    }
  }
  return total;
}

// ─── warnings ───────────────────────────────────────────────────────────

function buildGlobalWarnings(
  buckets: LaundryBucket[],
  constraints: LaundryConstraints,
  estimatedCost: number,
  context: CampusContext,
): string[] {
  const warnings: string[] = [];
  const budgetYuan = nonNegativeConstraintNumber(constraints.budget_yuan);
  if (budgetYuan != null && estimatedCost > budgetYuan) {
    warnings.push(`预计费用 ${estimatedCost} 元超过预算 ${budgetYuan} 元。`);
    warnings.push("若需压低费用，可推迟非急用标准洗批次，并优先保留手洗、自然晾干和高卫生需求衣物。");
  }
  warnings.push(...waitConstraintWarnings(buckets, constraints, context));
  for (const bucket of buckets) {
    warnings.push(...bucket.warnings);
  }
  return dedupe(warnings);
}

function waitConstraintWarnings(
  buckets: LaundryBucket[],
  constraints: LaundryConstraints,
  context: CampusContext,
): string[] {
  const maxWaitMinutes = nonNegativeConstraintNumber(constraints.max_wait_minutes);
  if (maxWaitMinutes == null) return [];
  const queueByType = new Map(context.queue_estimates.map((e) => [e.machine_type, e]));
  const warnings: string[] = [];

  for (const machineType of requiredMachineTypes(buckets)) {
    const estimate = queueByType.get(machineType);
    if (!estimate) {
      warnings.push(`缺少 ${machineType} 等待时间估算，无法确认是否满足最大等待 ${maxWaitMinutes} 分钟。`);
      continue;
    }
    const wait = estimate.estimated_wait_minutes;
    if (wait == null) {
      warnings.push(`${machineType} 等待时间未知，无法确认是否满足最大等待 ${maxWaitMinutes} 分钟。`);
      continue;
    }
    if (wait > maxWaitMinutes) {
      warnings.push(`${machineType} 预计等待 ${wait} 分钟超过最大等待 ${maxWaitMinutes} 分钟。`);
    }
  }
  return warnings;
}

function nonNegativeConstraintNumber(value: number | null): number | null {
  return typeof value === "number" && Number.isFinite(value) && value >= 0 ? value : null;
}

function requiredMachineTypes(buckets: LaundryBucket[]): MachineType[] {
  const types: MachineType[] = [];
  for (const bucket of buckets) {
    if (bucket.wash_method !== "machine_wash" || !bucket.machine_type) continue;
    types.push(bucket.machine_type);
    if (bucket.dry_method === "low_heat_dryer") types.push("dryer");
  }
  return [...new Set(types)];
}

function machineBucketWarnings(bucketId: string, items: WardrobeItemForPlan[]): string[] {
  const warnings: string[] = [];
  if (bucketId === "dark-standard") {
    warnings.push("深色或高掉色风险衣物已单独成桶，减少串色和返洗。");
  }
  if (bucketId === "mixed-standard") {
    warnings.push("用户允许混色，低掉色风险普通衣物合并成标准批次。");
  }
  if (bucketId === "large-bedding") {
    warnings.push("床品已单独成桶，使用标准洗衣机时不要与衣物混洗，避免过载导致洗不净。");
  }
  for (const item of items) {
    if (hasHighRisk(item, new Set(["color_bleed"]))) {
      warnings.push(`${item.profile.name} 掉色风险高，避免与浅色衣物混洗。`);
    }
  }
  return dedupe(warnings);
}

function capacityBucketWarnings(bucketId: string, baseBucketId: string): string[] {
  if (bucketId === baseBucketId) return [];
  return ["同类衣物数量较多，已按洗衣机容量拆成多桶，避免过载和洗不净。"];
}

function handWashWarnings(items: WardrobeItemForPlan[], context: CampusContext): string[] {
  const warnings = ["该批次不进入共享洗衣机，建议冷水轻柔手洗并自然晾干。"];
  for (const item of items) {
    if (containsAny(searchText(item), DO_NOT_DRY_TERMS) || dryerUnsafe(item)) {
      warnings.push(`${item.profile.name} 不可烘干或高温风险较高。`);
    }
  }
  warnings.push(...airDryContextWarnings(context));
  return dedupe(warnings);
}

function airDryContextWarnings(context: CampusContext): string[] {
  const dc = context.drying_context;
  const warnings: string[] = [];
  if (!dc || typeof dc !== "object") return warnings;
  if (dc.balcony_available === false) {
    warnings.push("当前晾晒条件显示无阳台，自然晾干批次需要预留更长时间或选择通风位置。");
  }
  const ventilation = String(dc.ventilation ?? "").trim().toLowerCase();
  if (ventilation && !["normal", "good", "strong", "良好", "通风良好"].includes(ventilation)) {
    warnings.push(`当前通风条件为 ${dc.ventilation}，自然晾干可能变慢。`);
  }
  return warnings;
}

// ─── detergent ──────────────────────────────────────────────────────────

function detergentMl(bucketId: string, items: WardrobeItemForPlan[]): number | null {
  const count = items.length;
  if (bucketId === "hand-wash") return Math.round(count * HAND_WASH_DETERGENT_ML_PER_ITEM * 10) / 10;
  if (bucketId === "large-bedding")
    return Math.round((LARGE_DETERGENT_ML_BASE + count * LARGE_DETERGENT_ML_PER_ITEM) * 10) / 10;
  if (bucketId === "dark-standard" || bucketId === "light-standard" || bucketId === "mixed-standard")
    return Math.round((STANDARD_DETERGENT_ML_BASE + count * STANDARD_DETERGENT_ML_PER_ITEM) * 10) / 10;
  return null;
}

// ─── machine matching ───────────────────────────────────────────────────

function requireAvailableMachine(
  available: MachineInfo[],
  machineType: MachineType,
  program: string,
): MachineInfo {
  const match = findAvailableMachine(available, machineType, program);
  if (!match) {
    throw new Error(`no available machine for ${machineType} program ${program}`);
  }
  return match;
}

function findAvailableMachine(
  available: MachineInfo[],
  machineType: MachineType,
  program: string,
): MachineInfo | null {
  return available.find(
    (m) => m.machine_type === machineType && m.status === "available" && m.modes.includes(program),
  ) ?? null;
}

function machineRecommendationWarning(machine: MachineInfo, program: string): string {
  return `推荐使用 ${machine.machine_id}，位置 ${machine.location}，程序 ${program}。`;
}

// ─── pricing helpers ────────────────────────────────────────────────────

function requireWashProgram(context: CampusContext, program: string): void {
  washProgramValue(context, program, "price_yuan");
  washProgramValue(context, program, "duration_minutes");
}

function requireDryerProgram(context: CampusContext, program: string): void {
  dryerProgramValue(context, program, "price_yuan");
  dryerProgramValue(context, program, "duration_minutes");
}

function washProgramValue(context: CampusContext, program: string, key: "price_yuan" | "duration_minutes"): number {
  const programs = context.pricing_rules.wash_programs;
  if (!programs || !(program in programs)) {
    throw new Error(`missing wash program pricing: ${program}`);
  }
  const rule = programs[program];
  if (!(key in rule)) {
    throw new Error(`missing wash program ${key}: ${program}`);
  }
  const value = Number(rule[key]);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`invalid wash program ${key}: ${program}`);
  }
  return value;
}

function dryerProgramValue(context: CampusContext, program: string, key: "price_yuan" | "duration_minutes"): number {
  const programs = context.pricing_rules.dryer_programs;
  if (!programs || !(program in programs)) {
    throw new Error(`missing dryer program pricing: ${program}`);
  }
  const rule = programs[program];
  if (!(key in rule)) {
    throw new Error(`missing dryer program ${key}: ${program}`);
  }
  const value = Number(rule[key]);
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`invalid dryer program ${key}: ${program}`);
  }
  return value;
}

// ─── item analysis helpers ──────────────────────────────────────────────

function dryerUnsafe(item: WardrobeItemForPlan): boolean {
  return (
    containsAny(searchText(item), DO_NOT_DRY_TERMS) ||
    hasMaterial(item, WOOL_TERMS) ||
    hasHighRisk(item, HIGH_DRY_RISK_KEYS)
  );
}

function anyRecommendsBag(items: WardrobeItemForPlan[]): boolean {
  return items.some(
    (item) => searchText(item).includes("laundry_bag") || searchText(item).includes("洗衣袋"),
  );
}

function hasMaterial(item: WardrobeItemForPlan, terms: Set<string>): boolean {
  const materials = Object.keys(item.profile.material_ratios).join(" ").toLowerCase();
  return containsAny(materials, terms);
}

function hasHighRisk(item: WardrobeItemForPlan, keys: Set<string>): boolean {
  for (const key of keys) {
    if (item.profile.risks[key] === "high") return true;
  }
  return false;
}

function searchText(item: WardrobeItemForPlan): string {
  const p = item.profile;
  return [
    p.name,
    p.user_note,
    ...Object.keys(p.material_ratios),
    ...p.colors,
    ...p.care_warnings,
    ...p.care_recommendations,
    ...p.care_forbidden,
    ...item.user_notes,
  ]
    .join(" ")
    .toLowerCase();
}

function containsAny(text: string, terms: Set<string>): boolean {
  for (const term of terms) {
    if (termMatches(text, term)) return true;
  }
  return false;
}

function termMatches(text: string, term: string): boolean {
  if (/^[a-z0-9 _-]+$/i.test(term)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(term);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function itemIds(items: WardrobeItemForPlan[]): string[] {
  return items.map((item) => item.profile.item_id);
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}
