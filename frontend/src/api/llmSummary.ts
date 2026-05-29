/**
 * LLM-powered natural language summaries.
 * Falls back to deterministic templates when ModelHub is not configured.
 */

import { hasCompleteModelHubConfig, type ModelHubConfig } from "./modelHubConfig";
import type { FrequencyAdvice, LaundryPlan, WeatherSnapshot } from "./types";

export interface LLMSummaryResult {
  text: string;
  source: "llm" | "fallback";
}

// ─── shared LLM call ────────────────────────────────────────────────────

async function callModelHub(
  prompt: string,
  systemInstruction: string,
  config: ModelHubConfig,
): Promise<string> {
  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/models/${encodeURIComponent(config.model_name)}:generateContent`;
  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-goog-api-key": config.apikey,
    },
    body: JSON.stringify({
      systemInstruction: { parts: [{ text: systemInstruction }] },
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 0.3 },
    }),
  });
  if (!response.ok) throw new Error(`ModelHub call failed: ${response.status}`);
  const raw: unknown = await response.json();
  const candidate = (raw as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates?.[0];
  const text = candidate?.content?.parts?.map((p) => p.text ?? "").join("") ?? "";
  if (!text.trim()) throw new Error("ModelHub returned empty text");
  return text.trim();
}

// ─── risk key labels ────────────────────────────────────────────────────

export function riskKeyLabel(key: string): string {
  const labels: Record<string, string> = {
    shrink: "缩水",
    color_bleed: "掉色",
    deform: "变形",
    pilling: "起球",
    dryer_damage: "烘干损伤",
  };
  return labels[key] || key;
}

// ─── B: plan summary ────────────────────────────────────────────────────

export async function generatePlanSummary(
  plan: LaundryPlan,
  config: ModelHubConfig,
): Promise<LLMSummaryResult> {
  if (!hasCompleteModelHubConfig(config)) {
    return { text: fallbackPlanSummary(plan), source: "fallback" };
  }
  try {
    const planData = {
      batches: plan.buckets.map((b) => ({
        id: b.bucket_id,
        method: b.wash_method,
        items: b.item_ids.length,
        program: b.program,
        detergent_ml: b.detergent_ml,
        laundry_bag: b.use_laundry_bag,
        dry: b.dry_method,
        warnings: b.warnings,
      })),
      cost: plan.estimated_cost_yuan,
      duration: plan.estimated_duration_minutes,
      summary: plan.summary,
    };
    const prompt = `以下是校园洗衣方案的结构化数据：\n${JSON.stringify(planData, null, 2)}\n\n请用2-3句简洁中文总结这个方案的关键信息（分桶策略、费用、注意事项），不要用列表或JSON。`;
    const text = await callModelHub(prompt, "你是校园洗衣助手，用简洁自然的中文回答。", config);
    return { text, source: "llm" };
  } catch {
    return { text: fallbackPlanSummary(plan), source: "fallback" };
  }
}

function fallbackPlanSummary(plan: LaundryPlan): string {
  if (!plan.buckets.length) return "当前没有待洗衣物。";
  const methods = plan.buckets.map((b) => {
    const m = b.wash_method === "hand_wash" ? "手洗" : b.wash_method === "machine_wash" ? "机洗" : b.wash_method === "dry_clean" ? "干洗" : "不水洗";
    return `${bucketLabel(b.bucket_id)}(${m})`;
  });
  const cost = plan.estimated_cost_yuan != null ? `预计费用 ¥${plan.estimated_cost_yuan}` : "费用待确认";
  const duration = plan.estimated_duration_minutes != null ? `，机器占用约 ${plan.estimated_duration_minutes} 分钟` : "";
  return `本次共 ${plan.buckets.length} 个批次：${methods.join("、")}。${cost}${duration}。`;
}

// ─── C: risk description ────────────────────────────────────────────────

export async function generateRiskDescription(
  risks: Record<string, string>,
  itemName: string,
  materialRatios: Record<string, number>,
  config: ModelHubConfig,
): Promise<LLMSummaryResult> {
  if (!hasCompleteModelHubConfig(config)) {
    return { text: fallbackRiskDescription(risks, itemName, materialRatios), source: "fallback" };
  }
  try {
    const materials = Object.entries(materialRatios)
      .map(([m, r]) => `${m} ${Math.round(r * 100)}%`)
      .join("、") || "未知";
    const riskText = Object.entries(risks)
      .map(([k, v]) => `${riskKeyLabel(k)}：${riskLevelText(v)}`)
      .join("、");
    const prompt = `衣物"${itemName}"，材质${materials}，风险评估：${riskText}。\n\n请用1-2句自然的中文描述洗护风险和建议，不要用列表或JSON。`;
    const text = await callModelHub(prompt, "你是衣物洗护风险分析助手，用简洁自然的中文回答。", config);
    return { text, source: "llm" };
  } catch {
    return { text: fallbackRiskDescription(risks, itemName, materialRatios), source: "fallback" };
  }
}

function riskLevelText(level: string): string {
  if (level === "high") return "高";
  if (level === "medium") return "中";
  if (level === "low") return "低";
  return "未知";
}

export function fallbackRiskDescription(
  risks: Record<string, string>,
  itemName: string,
  materialRatios: Record<string, number>,
): string {
  const entries = Object.entries(risks);
  if (!entries.length) return `${itemName}的风险信息暂未记录。`;
  const high = entries.filter(([, v]) => v === "high").map(([k]) => riskKeyLabel(k));
  const medium = entries.filter(([, v]) => v === "medium").map(([k]) => riskKeyLabel(k));
  const parts: string[] = [];
  if (high.length) parts.push(`${high.join("、")}风险较高，需特别注意`);
  if (medium.length) parts.push(`${medium.join("、")}有一定风险`);
  const materials = Object.entries(materialRatios).map(([m, r]) => `${m} ${Math.round(r * 100)}%`);
  if (materials.length) parts.push(`主要材质为${materials.join("、")}`);
  if (!parts.length) return `${itemName}未检测到明显洗护风险。`;
  return `${itemName}：${parts.join("；")}。`;
}

// ─── D: today advice ────────────────────────────────────────────────────

export async function generateTodayAdvice(
  plan: LaundryPlan,
  weather: WeatherSnapshot | undefined,
  frequencyAdvice: FrequencyAdvice[] | undefined,
  config: ModelHubConfig,
): Promise<LLMSummaryResult> {
  if (!hasCompleteModelHubConfig(config)) {
    return { text: fallbackTodayAdvice(plan, weather, frequencyAdvice), source: "fallback" };
  }
  try {
    const weatherText =
      weather?.status === "live" && weather.current
        ? `温度 ${weather.current.temperature_2m}°C，湿度 ${weather.current.relative_humidity_2m}%，降水 ${weather.current.precipitation}mm`
        : "天气信息暂不可用";
    const urgentItems = (frequencyAdvice ?? []).filter((a) => a.priority_score >= 75);
    const prompt = [
      `当前校园洗衣情况：`,
      `- 天气：${weatherText}`,
      `- 待洗：${plan.buckets.length} 个批次，共 ${plan.buckets.reduce((s, b) => s + b.item_ids.length, 0)} 件`,
      `- 费用：${plan.estimated_cost_yuan != null ? `¥${plan.estimated_cost_yuan}` : "待确认"}`,
      urgentItems.length ? `- 急用衣物：${urgentItems.map((a) => a.item_id).join("、")}` : "",
      `\n请用2-3句简洁中文给出今天的洗衣建议（时机和注意事项），不要用列表或JSON。`,
    ].join("\n");
    const text = await callModelHub(prompt, "你是校园洗衣助手，用简洁自然的中文给出建议。", config);
    return { text, source: "llm" };
  } catch {
    return { text: fallbackTodayAdvice(plan, weather, frequencyAdvice), source: "fallback" };
  }
}

function fallbackTodayAdvice(
  plan: LaundryPlan,
  weather: WeatherSnapshot | undefined,
  frequencyAdvice: FrequencyAdvice[] | undefined,
): string {
  const parts: string[] = [];
  if (weather?.status === "live" && weather.current) {
    const precip = weather.current.precipitation ?? 0;
    const humidity = weather.current.relative_humidity_2m ?? 50;
    if (precip > 0 || humidity > 80) {
      parts.push("当前湿度较高，自然晾干可能较慢，建议使用烘干机。");
    } else if (humidity < 50) {
      parts.push("天气条件适合自然晾干。");
    }
  }
  if (plan.buckets.length > 0) {
    const cost = plan.estimated_cost_yuan != null ? `预计 ¥${plan.estimated_cost_yuan}` : "费用待确认";
    parts.push(`本次 ${plan.buckets.length} 个批次，${cost}。`);
  }
  const urgent = (frequencyAdvice ?? []).filter((a) => a.priority_score >= 75);
  if (urgent.length > 0) parts.push(`有 ${urgent.length} 件衣物建议优先清洗。`);
  return parts.length > 0 ? parts.join("") : "当前没有需要特别关注的洗衣事项。";
}

// ─── shared label helpers ───────────────────────────────────────────────

export function bucketLabel(bucketId: string): string {
  const normalizedBucketId = baseBucketId(bucketId);
  const labels: Record<string, string> = {
    "do-not-wash": "不可水洗",
    "dry-clean": "干洗",
    "hand-wash": "手洗",
    "large-bedding": "大件",
    "dark-standard": "深色标准",
    "light-standard": "浅色标准",
  };
  return labels[normalizedBucketId] ?? bucketId;
}

function baseBucketId(bucketId: string): string {
  return bucketId.replace(/-\d+$/, "");
}

export function computeRecommendedStartTime(
  planDurationMinutes: number | null,
  latestPickupTime: string | null,
): string {
  const now = new Date();
  const duration = isValidDuration(planDurationMinutes) ? planDurationMinutes : 60;
  const buffer = 15;
  if (latestPickupTime) {
    const [h, m] = latestPickupTime.split(":").map(Number);
    if (isValidTimePart(h, 23) && isValidTimePart(m, 59)) {
      const pickup = new Date(now);
      pickup.setHours(h, m, 0, 0);
      const latestStart = new Date(pickup.getTime() - (duration + buffer) * 60000);
      if (latestStart > now) {
        return `${String(latestStart.getHours()).padStart(2, "0")}:${String(latestStart.getMinutes()).padStart(2, "0")}`;
      }
    }
  }
  const suggested = new Date(now.getTime() + buffer * 60000);
  return `${String(suggested.getHours()).padStart(2, "0")}:${String(suggested.getMinutes()).padStart(2, "0")}`;
}

function isValidTimePart(value: number, max: number): boolean {
  return Number.isInteger(value) && value >= 0 && value <= max;
}

function isValidDuration(value: number | null): value is number {
  return typeof value === "number" && Number.isFinite(value) && value > 0;
}
