/**
 * User-facing laundry report generation.
 * Ported from backend/reports/generator.py so the APK is self-contained.
 */

import type {
  CampusContext,
  DryMethod,
  LaundryBucket,
  LaundryPlan,
  MachineInfo,
  MachineQueueEstimate,
  MachineType,
  WardrobeItemForPlan,
  WashMethod,
  WashReport,
} from "./types";

export function generateReport(
  plan: LaundryPlan,
  items: WardrobeItemForPlan[],
  campusContext: CampusContext,
): WashReport {
  validateReportItemsUnique(items);
  validatePlanItemIdsPresent(plan, items);
  validatePlanItemIdsUnique(plan);
  validateBucketNumbers(plan);
  const itemNames = new Map(items.map((item) => [item.profile.item_id, item.profile.name]));
  return {
    title: "本次校园洗衣报告",
    sections: {
      "洗衣步骤": stepsSection(plan, itemNames),
      "费用和时间": costTimeSection(plan),
      "机器环境": campusSection(campusContext),
      "风险提醒": riskSection(plan),
    },
    savings_notes: savingsNotes(plan),
    risk_notes: riskNotes(plan),
  };
}

// ─── sections ───────────────────────────────────────────────────────────

function stepsSection(plan: LaundryPlan, itemNames: Map<string, string>): string {
  const lines: string[] = [];
  for (let i = 0; i < plan.buckets.length; i++) {
    const bucket = plan.buckets[i];
    const names = bucket.item_ids.map((id) => itemName(id, itemNames));
    const parts = [
      `${i + 1}. ${bucketTitle(bucket)}：${names.join("、")}`,
      `原因：${bucketReason(bucket)}`,
      `洗护方式：${washMethodText(bucket.wash_method)}`,
    ];
    if (bucket.program) parts.push(`程序：${programText(bucket.program)}`);
    if (bucket.detergent_ml != null) parts.push(`洗衣液：${bucket.detergent_ml} ml`);
    if (bucket.use_laundry_bag) parts.push("使用洗衣袋");
    parts.push(`干燥：${dryMethodText(bucket.dry_method)}`);
    if (bucket.warnings.length) parts.push(`提醒：${bucket.warnings.map(userFacingWarning).join("；")}`);
    lines.push(parts.join("；") + "。");
  }
  return lines.join("\n");
}

function costTimeSection(plan: LaundryPlan): string {
  if (plan.estimated_cost_yuan == null) throw new Error("plan estimated_cost_yuan is required for report");
  if (plan.estimated_duration_minutes == null) throw new Error("plan estimated_duration_minutes is required for report");
  const estimatedCost = requiredNonNegativeNumber(plan.estimated_cost_yuan, "plan.estimated_cost_yuan");
  const estimatedDuration = requiredNonNegativeInteger(plan.estimated_duration_minutes, "plan.estimated_duration_minutes");
  const charged = chargedBatches(plan);
  const batchText = charged.length ? charged.join("；") : "本次没有共享洗衣机或烘干机计费批次";
  return (
    `预计费用 ${estimatedCost} 元，预计机器占用时间 ${estimatedDuration} 分钟。` +
    `计费批次：${batchText}。`
  );
}

function campusSection(context: CampusContext): string {
  const available = context.available_machines.length;
  const total = context.all_machines.length;
  const parts = [
    `当前可用洗衣设备 ${available} 台，系统共记录 ${total} 台。`,
  ];
  const locations = availableMachineLocations(context.available_machines);
  if (locations) parts.push(`可用位置：${locations}。`);
  const queues = queueSummary(context.queue_estimates);
  if (queues) parts.push(`排队估算：${queues}。`);
  const drying = dryingContextSummary(context.drying_context);
  if (drying) parts.push(`晾晒条件：${drying}。`);
  return parts.join("\n");
}

function riskSection(plan: LaundryPlan): string {
  const warnings = dedupe([
    ...plan.buckets.flatMap((b) => b.warnings),
    ...plan.global_warnings,
  ].map(userFacingWarning));
  if (!warnings.length) return "本次计划没有额外风险提醒。";
  return warnings.map((w) => `- ${w}`).join("\n");
}

// ─── savings / risk notes ───────────────────────────────────────────────

function savingsNotes(plan: LaundryPlan): string[] {
  const notes: string[] = [];
  if (plan.buckets.some((b) => b.dry_method === "air_dry")) {
    notes.push("自然晾干批次减少烘干用电，也能降低缩水和变形风险。");
  }
  if (plan.buckets.some((b) => baseBucketId(b.bucket_id) === "dark-standard" || baseBucketId(b.bucket_id) === "hand-wash")) {
    notes.push("高风险衣物分开处理，能减少串色、返洗和重复用水。");
  }
  if (plan.buckets.some((b) => baseBucketId(b.bucket_id) === "large-bedding")) {
    notes.push("床品单独成桶，减少过载造成的洗不净和返洗。");
  }
  return dedupe(notes);
}

function riskNotes(plan: LaundryPlan): string[] {
  const notes: string[] = [];
  for (const bucket of plan.buckets) {
    if (baseBucketId(bucket.bucket_id) === "dark-standard") {
      notes.push("深色或掉色风险衣物不要与浅色衣物混洗。");
    }
    if (["hand_wash", "dry_clean", "do_not_wash"].includes(bucket.wash_method)) {
      notes.push("非普通机洗衣物应按单独批次处理，不进入共享洗衣机。");
    }
    notes.push(...bucket.warnings.map(userFacingWarning));
  }
  notes.push(...plan.global_warnings.map(userFacingWarning));
  return dedupe(notes);
}

// ─── helpers ────────────────────────────────────────────────────────────

function bucketReason(bucket: LaundryBucket): string {
  const bucketId = baseBucketId(bucket.bucket_id);
  const reasons: Record<string, string> = {
    "do-not-wash": "洗护标签或用户偏好提示不可水洗",
    "dry-clean": "该批次需要专业干洗",
    "hand-wash": "材质或风险提示不适合共享洗衣机",
    "large-bedding": "床品体积大，单独占用洗衣机减少过载和返洗",
    "dark-standard": "深色或高掉色风险衣物单独处理，避免串色",
    "light-standard": "浅色普通机洗衣物集中标准洗",
    "mixed-standard": "用户允许混色，低掉色风险普通衣物合并标准洗",
  };
  return reasons[bucketId] ?? "本批衣物需要单独处理";
}

function chargedBatches(plan: LaundryPlan): string[] {
  const batches: string[] = [];
  for (const bucket of plan.buckets) {
    if (bucket.wash_method === "machine_wash") batches.push(`${bucketTitle(bucket)} · ${programText(bucket.program)}`);
    if (bucket.dry_method === "low_heat_dryer") batches.push(`${bucketTitle(bucket)} · 低温烘干`);
  }
  return batches;
}

function availableMachineLocations(machines: MachineInfo[]): string {
  if (!machines.length) return "";
  const grouped = new Map<string, string[]>();
  for (const machine of machines) {
    const key = `${machine.location} ${machineTypeText(machine.machine_type)}`.trim();
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(machine.machine_id);
  }
  return [...grouped.entries()].map(([loc, ids]) => `${loc} ${ids.length} 台`).join("；");
}

function queueSummary(estimates: MachineQueueEstimate[]): string {
  if (!estimates.length) return "";
  return estimates
    .map((e) => {
      const wait = queueWaitText(e.estimated_wait_minutes);
      return `${machineTypeText(e.machine_type)} 可用 ${e.available_count}/${e.total_count}，预计等待 ${wait}`;
    })
    .join("；");
}

function queueWaitText(minutes: number | null): string {
  return typeof minutes === "number" && Number.isInteger(minutes) && minutes >= 0 ? `${minutes} 分钟` : "未知";
}

function dryingContextSummary(dc: Record<string, unknown>): string {
  if (!dc || !Object.keys(dc).length) return "";
  const parts: string[] = [];
  if ("balcony_available" in dc) parts.push(dc.balcony_available ? "有阳台" : "无阳台");
  if ("ventilation" in dc) parts.push(`通风 ${dc.ventilation}`);
  return parts.join("，");
}

function bucketTitle(bucket: LaundryBucket): string {
  const bucketId = baseBucketId(bucket.bucket_id);
  const labels: Record<string, string> = {
    "do-not-wash": "不可水洗衣物",
    "dry-clean": "干洗衣物",
    "hand-wash": "手洗衣物",
    "large-bedding": "床品单独洗",
    "dark-standard": "深色标准洗",
    "light-standard": "浅色标准洗",
    "mixed-standard": "混色标准洗",
  };
  return labels[bucketId] ?? "本批衣物";
}

function baseBucketId(bucketId: string): string {
  return bucketId.replace(/-\d+$/, "");
}

function programText(program: string): string {
  const labels: Record<string, string> = {
    standard: "标准洗",
    quick: "快洗",
    large: "大件洗",
    spin: "单脱水",
    tub_clean: "筒自洁",
    standard_40c: "40 度标准洗",
    standard_60c_uv: "60 度紫外标准洗",
    low: "低温烘干",
  };
  return labels[program] ?? "合适程序";
}

function userFacingWarning(text: string): string {
  return text
    .replace(/\bstandard_washer\b/g, "洗衣机")
    .replace(/\bshoe_washer\b/g, "洗鞋机")
    .replace(/\bdryer\b/g, "烘干机")
    .replace(/程序\s+standard/g, "程序 标准洗")
    .replace(/程序\s+quick/g, "程序 快洗")
    .replace(/程序\s+large/g, "程序 大件洗")
    .replace(/程序\s+low/g, "程序 低温烘干");
}

function itemName(id: string, names: Map<string, string>): string {
  const name = names.get(id);
  if (!name) throw new Error(`report item id not found: ${id}`);
  return name;
}

function validatePlanItemIdsUnique(plan: LaundryPlan): void {
  const seen = new Set<string>();
  const duplicates: string[] = [];
  for (const bucket of plan.buckets) {
    for (const itemId of bucket.item_ids) {
      if (seen.has(itemId)) {
        duplicates.push(itemId);
        continue;
      }
      seen.add(itemId);
    }
  }
  if (duplicates.length) {
    throw new Error(`plan duplicate item ids: ${dedupe(duplicates).join(", ")}`);
  }
}

function validateReportItemsUnique(items: WardrobeItemForPlan[]): void {
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

function validatePlanItemIdsPresent(plan: LaundryPlan, items: WardrobeItemForPlan[]): void {
  const itemIds = new Set(items.map((item) => item.profile.item_id));
  const missing = plan.buckets
    .flatMap((bucket) => bucket.item_ids)
    .filter((itemId) => !itemIds.has(itemId));
  if (missing.length) {
    throw new Error(`items missing plan item ids: ${dedupe(missing).join(", ")}`);
  }
}

function validateBucketNumbers(plan: LaundryPlan): void {
  plan.buckets.forEach((bucket, index) => {
    if (bucket.detergent_ml != null) {
      requiredNonNegativeNumber(bucket.detergent_ml, `plan.buckets[${index}].detergent_ml`);
    }
  });
}

function washMethodText(method: WashMethod): string {
  const labels: Record<WashMethod, string> = {
    hand_wash: "手洗",
    machine_wash: "机洗",
    dry_clean: "干洗",
    do_not_wash: "不水洗",
    unknown: "未知",
  };
  return labels[method];
}

function dryMethodText(method: DryMethod): string {
  const labels: Record<DryMethod, string> = {
    air_dry: "自然晾干",
    low_heat_dryer: "低温烘干",
    normal_dryer: "普通烘干",
    do_not_dry: "不烘干",
    unknown: "未知",
  };
  return labels[method];
}

function machineTypeText(type: MachineType): string {
  const labels: Record<MachineType, string> = {
    standard_washer: "洗衣机",
    shoe_washer: "洗鞋机",
    dryer: "烘干机",
    unknown: "未知机器",
  };
  return labels[type];
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

function requiredNonNegativeNumber(value: number, fieldName: string): number {
  if (!Number.isFinite(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative finite number`);
  }
  return value;
}

function requiredNonNegativeInteger(value: number, fieldName: string): number {
  if (!Number.isInteger(value) || value < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`);
  }
  return value;
}
