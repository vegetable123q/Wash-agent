/**
 * Laundry decision and bucket planning.
 * Ported from backend/laundry/planner.py so the APK is self-contained.
 *
 * The planner produces a **wash-phase** plan.  Use ``recommendDrying``
 * to obtain dryer assignments after the user accepts the wash plan.
 */

import type {
  CampusContext,
  DryingPlan,
  DryingStep,
  LaundryBucket,
  LaundryChargeLine,
  LaundryConstraints,
  LaundryPlan,
  MachineInfo,
  MachineType,
  WardrobeItemForPlan,
} from "./types";
import { splitItemsByLaundryLoad } from "./laundryLoad";

// ─── constants ──────────────────────────────────────────────────────────

const DARK_COLOR_TERMS = new Set(["black", "dark", "navy", "indigo", "深色", "黑", "藏青", "靛蓝"]);
const LIGHT_COLOR_TERMS = new Set(["white", "light", "gray", "grey", "浅色", "白", "灰"]);
const BEDDING_TERMS = new Set(["bedding", "sheet", "duvet", "床单", "被套", "床品"]);
const WOOL_TERMS = new Set(["wool", "羊毛", "cashmere", "羊绒"]);
const HAND_WASH_TERMS = new Set(["hand_wash_only", "hand wash only", "只能手洗", "仅限手洗"]);
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
const UNSPLITTABLE_BUCKET_IDS = new Set(["do-not-wash", "dry-clean", "hand-wash"]);

// ─── wash-phase entry ───────────────────────────────────────────────────

export function planLaundry(
  items: WardrobeItemForPlan[],
  constraints: LaundryConstraints,
  campusContext: CampusContext,
): LaundryPlan {
  validateUniqueItemIds(items);
  const selected = selectedItems(items, constraints.selected_item_ids);
  const bucketInputs = splitBucketInputs(selected, constraints);
  const machinePool = [...campusContext.available_machines];
  const buckets = bucketInputs.map(({ bucketId, baseBucketId, items: bucketItems }) =>
    buildBucket(bucketId, baseBucketId, bucketItems, constraints, campusContext, machinePool),
  );

  const costBreakdown = washCostBreakdown(buckets, campusContext);
  const estimatedCost = estimateCost(costBreakdown, buckets);
  const estimatedDuration = estimateDuration(costBreakdown, buckets);
  const globalWarnings = buildGlobalWarnings(buckets, constraints, estimatedCost, campusContext);

  return {
    buckets,
    estimated_cost_yuan: estimatedCost,
    estimated_duration_minutes: estimatedDuration,
    summary: `本次共 ${buckets.length} 个洗护批次，已按容量、颜色、材质、床品和高风险衣物分开处理。`,
    global_warnings: globalWarnings,
  };
}

// ─── drying-phase entry ─────────────────────────────────────────────────

export function recommendDrying(
  buckets: LaundryBucket[],
  campusContext: CampusContext,
  options?: {
    allowDryer?: boolean;
    preferredMachineFloor?: number | null;
    items?: WardrobeItemForPlan[];
  },
): DryingPlan {
  const allowDryer = options?.allowDryer ?? false;
  const preferredFloor = options?.preferredMachineFloor;
  const itemsById = options?.items
    ? new Map(options.items.map((item) => [item.profile.item_id, item]))
    : null;

  const steps: DryingStep[] = [];
  const costBreakdown: LaundryChargeLine[] = [];
  const dryerPool = [...campusContext.available_machines];
  let totalCost = 0;
  let totalDuration = 0;

  for (const bucket of buckets) {
    // Non-machine buckets already have their final dry_method.
    if (bucket.wash_method !== "machine_wash") {
      const dryWarnings: string[] = [];
      if (bucket.wash_method === "hand_wash") {
        for (const warning of bucket.warnings) {
          if (warning.includes("不可烘干") || warning.includes("高温")) {
            dryWarnings.push(warning);
          }
        }
        if (!dryWarnings.length && bucket.dry_method === "air_dry" && itemsById) {
          const bucketItems = bucket.item_ids
            .map((id) => itemsById.get(id))
            .filter(Boolean) as WardrobeItemForPlan[];
          const unsafeNames = bucketItems.filter(dryerUnsafe).map((item) => item.profile.name);
          if (unsafeNames.length) {
            dryWarnings.push(`${unsafeNames.join("、")} 不可烘干或存在高温损伤风险，改为自然晾干。`);
          }
        }
      }
      steps.push({
        bucket_id: bucket.bucket_id,
        item_ids: bucket.item_ids,
        dry_method: bucket.dry_method,
        warnings: dryWarnings,
      });
      continue;
    }

    if (!bucket.machine_id) {
      steps.push({
        bucket_id: bucket.bucket_id,
        item_ids: bucket.item_ids,
        dry_method: bucket.dry_method,
        warnings: ["洗衣机未分配，暂不安排烘干。"],
      });
      continue;
    }

    // Check dryer safety.
    const bucketItems = itemsById
      ? bucket.item_ids.map((id) => itemsById.get(id)).filter(Boolean) as WardrobeItemForPlan[]
      : [];
    const unsafeNames = bucketItems.filter(dryerUnsafe).map((item) => item.profile.name);
    const canDry = allowDryer && unsafeNames.length === 0;

    if (!canDry) {
      const warnings: string[] = [];
      if (!allowDryer) {
        warnings.push("用户未允许烘干，本批次自然晾干。");
      } else if (unsafeNames.length) {
        warnings.push(`${unsafeNames.join("、")} 不可烘干或存在高温损伤风险，改为自然晾干。`);
      }
      warnings.push(...airDryContextWarnings(campusContext));
      steps.push({
        bucket_id: bucket.bucket_id,
        item_ids: bucket.item_ids,
        dry_method: "air_dry",
        warnings,
      });
      continue;
    }

    // Try to assign an available dryer.
    const dryer = reserveAvailableMachine(dryerPool, "dryer", "low", preferredFloor);
    if (!dryer) {
      steps.push({
        bucket_id: bucket.bucket_id,
        item_ids: bucket.item_ids,
        dry_method: "air_dry",
        warnings: ["没有空闲烘干机"],
      });
      continue;
    }

    requireDryerProgram(campusContext, "low");
    const dryerCost = dryerProgramValue(campusContext, "low", "price_yuan");
    const dryerDuration = Math.round(dryerProgramValue(campusContext, "low", "duration_minutes"));

    steps.push({
      bucket_id: bucket.bucket_id,
      item_ids: bucket.item_ids,
      dry_method: "low_heat_dryer",
      dryer_machine_id: dryer.machine_id,
      dryer_machine_location: dryer.location,
      dryer_machine_floor: dryer.machine_floor ?? null,
      estimated_cost_yuan: Math.round(dryerCost * 100) / 100,
      estimated_duration_minutes: dryerDuration,
      warnings: [machineRecommendationWarning(dryer, "low")],
    });
    costBreakdown.push({
      bucket_id: bucket.bucket_id,
      label: `${bucket.bucket_id} 低温烘干`,
      amount_yuan: Math.round(dryerCost * 100) / 100,
      duration_minutes: dryerDuration,
      machine_id: dryer.machine_id,
      machine_type: "dryer",
      program: "low",
    });
    totalCost += dryerCost;
    totalDuration += dryerDuration;
  }

  return {
    steps,
    estimated_cost_yuan: totalCost ? Math.round(totalCost * 100) / 100 : null,
    estimated_duration_minutes: totalDuration || null,
    cost_breakdown: costBreakdown,
    warnings: [],
  };
}

// ─── item selection ─────────────────────────────────────────────────────

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
    const groupItems = groups.get(baseBucketId)!;
    const chunks = UNSPLITTABLE_BUCKET_IDS.has(baseBucketId)
      ? [groupItems]
      : splitItemsByLaundryLoad(groupItems);
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
    hasMaterial(item, WOOL_TERMS)
  ) {
    return "hand-wash";
  }
  if (containsAny(text, BEDDING_TERMS)) return "large-bedding";
  const hasColorBleedRisk = hasHighRisk(item, new Set(["color_bleed"]));
  if (containsAny(text, DARK_COLOR_TERMS) || hasColorBleedRisk) {
    if (constraints.allow_mixed_colors && !hasColorBleedRisk) return "mixed-standard";
    return "dark-standard";
  }
  if (containsAny(text, LIGHT_COLOR_TERMS)) {
    return constraints.allow_mixed_colors ? "mixed-standard" : "light-standard";
  }
  return "dark-standard"; // default: treat unknown as dark for safety
}

// ─── bucket building (wash-only) ────────────────────────────────────────

function buildBucket(
  bucketId: string,
  baseBucketId: string,
  items: WardrobeItemForPlan[],
  constraints: LaundryConstraints,
  context: CampusContext,
  machinePool: MachineInfo[],
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
      estimated_cost_yuan: 0,
      estimated_duration_minutes: 0,
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
      estimated_cost_yuan: 0,
      estimated_duration_minutes: 0,
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
      estimated_cost_yuan: 0,
      estimated_duration_minutes: 0,
      warnings: handWashWarnings(items, context),
    };
  }

  const program = baseBucketId === "large-bedding" ? "large" : "standard";
  const machineType: MachineType = "standard_washer";
  requireWashProgram(context, program);
  const washCost = washProgramValue(context, program, "price_yuan");
  const washDuration = Math.round(washProgramValue(context, program, "duration_minutes"));
  const machine = reserveAvailableMachine(machinePool, machineType, program, constraints.preferred_machine_floor);

  const warnings = [
    ...machineBucketWarnings(baseBucketId, items),
    ...capacityBucketWarnings(bucketId, baseBucketId),
    machine ? machineRecommendationWarning(machine, program) : "没有空闲洗衣机",
    ...airDryContextWarnings(context),
  ];

  const bucket: LaundryBucket = {
    bucket_id: bucketId,
    item_ids: itemIds(items),
    wash_method: "machine_wash",
    machine_type: machineType,
    program,
    detergent_ml: detergentMl(baseBucketId, items),
    use_laundry_bag: baseBucketId === "dark-standard" || constraints.hygiene_sensitive || anyRecommendsBag(items) || anyHighShrinkDeform(items),
    dry_method: "air_dry", // safe default; overridden by recommendDrying
    estimated_cost_yuan: machine ? Math.round(washCost * 100) / 100 : null,
    estimated_duration_minutes: machine ? washDuration : null,
    warnings: dedupe(warnings),
  };
  if (machine) {
    bucket.machine_id = machine.machine_id;
    bucket.machine_location = machine.location;
    bucket.machine_floor = machine.machine_floor ?? null;
  }
  return bucket;
}

// ─── cost helpers ───────────────────────────────────────────────────────

function washCostBreakdown(buckets: LaundryBucket[], context: CampusContext): LaundryChargeLine[] {
  const lines: LaundryChargeLine[] = [];
  for (const bucket of buckets) {
    if (bucket.wash_method !== "machine_wash") continue;
    if (!bucket.machine_id) continue;
    const program = bucket.program;
    lines.push({
      bucket_id: bucket.bucket_id,
      label: `${bucket.bucket_id} ${program} 洗`,
      amount_yuan: Math.round(washProgramValue(context, program, "price_yuan") * 100) / 100,
      duration_minutes: Math.round(washProgramValue(context, program, "duration_minutes")),
      machine_id: bucket.machine_id,
      machine_type: bucket.machine_type,
      program,
    });
  }
  return lines;
}

function hasUnassignedMachineWashBucket(buckets: LaundryBucket[]): boolean {
  return buckets.some((bucket) => bucket.wash_method === "machine_wash" && !bucket.machine_id);
}

function estimateCost(breakdown: LaundryChargeLine[], buckets: LaundryBucket[] = []): number | null {
  if (hasUnassignedMachineWashBucket(buckets)) return null;
  return Math.round(breakdown.reduce((sum, line) => sum + line.amount_yuan, 0) * 100) / 100;
}

function estimateDuration(breakdown: LaundryChargeLine[], buckets: LaundryBucket[] = []): number | null {
  if (hasUnassignedMachineWashBucket(buckets)) return null;
  return breakdown.reduce((sum, line) => sum + line.duration_minutes, 0);
}

// ─── warnings ───────────────────────────────────────────────────────────

function buildGlobalWarnings(
  buckets: LaundryBucket[],
  constraints: LaundryConstraints,
  estimatedCost: number | null,
  context: CampusContext,
): string[] {
  const warnings: string[] = [];
  const budgetYuan = nonNegativeConstraintNumber(constraints.budget_yuan);
  if (budgetYuan != null && estimatedCost != null && estimatedCost > budgetYuan) {
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
  const maxWaitMinutes = nonNegativeIntegerConstraintNumber(constraints.max_wait_minutes);
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

function nonNegativeIntegerConstraintNumber(value: number | null): number | null {
  const numberValue = nonNegativeConstraintNumber(value);
  return numberValue != null && Number.isInteger(numberValue) ? numberValue : null;
}

function requiredMachineTypes(buckets: LaundryBucket[]): MachineType[] {
  const types: MachineType[] = [];
  for (const bucket of buckets) {
    if (bucket.wash_method !== "machine_wash" || !bucket.machine_type) continue;
    types.push(bucket.machine_type);
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
    if (hasHighRisk(item, new Set(["shrink"]))) {
      warnings.push(`${item.profile.name} 有缩水风险，建议使用洗衣袋并自然晾干。`);
    }
    if (hasHighRisk(item, new Set(["deform"]))) {
      warnings.push(`${item.profile.name} 有变形风险，建议使用洗衣袋并选轻柔程序。`);
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

function reserveAvailableMachine(
  available: MachineInfo[],
  machineType: MachineType,
  program: string,
  preferredFloor?: number | null,
): MachineInfo | null {
  const candidates = available.filter(
    (m) => m.machine_type === machineType && m.status === "available" && supportsProgram(m, program),
  );
  if (!candidates.length) {
    return null;
  }
  const selected = bestMachineForFloor(candidates, preferredFloor);
  const selectedIndex = available.findIndex((machine) => machine.machine_id === selected.machine_id);
  if (selectedIndex >= 0) {
    available.splice(selectedIndex, 1);
  }
  return selected;
}

function supportsProgram(machine: MachineInfo, program: string): boolean {
  return machine.modes.length === 0 || machine.modes.includes(program);
}

function bestMachineForFloor(candidates: MachineInfo[], preferredFloor?: number | null): MachineInfo {
  if (preferredFloor == null || !Number.isFinite(preferredFloor)) {
    return candidates[0];
  }
  return [...candidates].sort((a, b) => machineFloorRank(a, preferredFloor) - machineFloorRank(b, preferredFloor))[0];
}

function machineFloorRank(machine: MachineInfo, preferredFloor: number): number {
  if (machine.machine_floor == null || !Number.isFinite(machine.machine_floor)) {
    return Number.POSITIVE_INFINITY;
  }
  return Math.abs(machine.machine_floor - preferredFloor);
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
  const value = rule[key];
  if (!validProgramValue(value, key)) {
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
  const value = rule[key];
  if (!validProgramValue(value, key)) {
    throw new Error(`invalid dryer program ${key}: ${program}`);
  }
  return value;
}

// ─── item analysis helpers ──────────────────────────────────────────────

function validProgramValue(value: unknown, key: "price_yuan" | "duration_minutes"): value is number {
  if (typeof value !== "number" || !Number.isFinite(value)) return false;
  if (key === "duration_minutes") return Number.isInteger(value) && value > 0;
  return value >= 0;
}

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

function anyHighShrinkDeform(items: WardrobeItemForPlan[]): boolean {
  return items.some(
    (item) => hasHighRisk(item, new Set(["shrink", "deform"])),
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
