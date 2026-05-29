/**
 * Wash frequency recommendation logic.
 * Ported from backend/wardrobe/frequency_advisor.py so the APK is self-contained.
 */

import type { FrequencyAdvice, LaundryConstraints, RiskLevel, WardrobeItemForPlan } from "./types";

const FREQUENCY_THRESHOLDS: Record<string, number> = {
  underwear: 1,
  sock: 1,
  sport: 1,
  sports: 1,
  "t-shirt": 2,
  tee: 2,
  tshirt: 2,
  shirt: 2,
  hoodie: 3,
  sweater: 4,
  wool: 4,
  jeans: 5,
  denim: 5,
  pants: 4,
  coat: 8,
  bedding: 1,
  内衣: 1,
  贴身: 1,
  袜: 1,
  运动: 1,
  速干: 1,
  t恤: 2,
  "t 恤": 2,
  衬衫: 2,
  卫衣: 3,
  羊毛: 4,
  毛衣: 4,
  牛仔: 5,
  裤: 4,
  外套: 8,
  床单: 1,
  被套: 1,
};

const LOW_FREQUENCY_TERMS = new Set(["jeans", "denim", "sweater", "wool", "coat", "牛仔", "羊毛", "毛衣", "外套"]);
const SPORT_TERMS = new Set(["sport", "sports", "运动", "速干", "sweat", "出汗"]);
const STAIN_TERMS = new Set(["stain", "污渍", "油渍"]);
const FREQUENCY_RISK_KEYS = new Set(["shrink", "color_bleed", "deform", "pilling", "dryer_damage"]);

export function adviseFrequency(item: WardrobeItemForPlan, constraints: LaundryConstraints): FrequencyAdvice {
  const text = searchText(item);
  const threshold = thresholdFor(text);
  const reasons: string[] = [];
  let score = 0;

  if (item.wear_count_since_wash >= threshold) {
    score += 45;
    reasons.push(`已穿 ${item.wear_count_since_wash} 次，达到建议清洗阈值 ${threshold} 次。`);
  } else {
    reasons.push(`已穿 ${item.wear_count_since_wash} 次，未达到建议清洗阈值 ${threshold} 次。`);
  }

  if (constraints.urgent_item_ids.includes(item.profile.item_id)) {
    score += 25;
    reasons.push("该衣物被标记为本次急用，优先级提高。");
  }

  if (containsAny(text, SPORT_TERMS)) {
    score += 35;
    reasons.push("运动后或出汗后穿着，建议及时清洗。");
  }

  if (containsAny(text, STAIN_TERMS)) {
    score += 35;
    reasons.push("用户记录有明显污渍，建议本次优先处理。");
  }

  if (containsAny(text, LOW_FREQUENCY_TERMS) && item.wear_count_since_wash < threshold) {
    score -= 15;
    reasons.push("牛仔、羊毛或外套类衣物可适当少洗，减少褪色、缩水和变形。");
  }

  const penalty = riskPenalty(item);
  if (penalty) {
    score -= penalty;
    reasons.push("历史或抽取结果提示存在缩水、掉色、变形等风险，频率建议不会强行要求机洗。");
  }

  if (constraints.hygiene_sensitive && containsAny(text, new Set(["underwear", "sock", "内衣", "贴身", "袜"]))) {
    score += 20;
    reasons.push("贴身或高卫生敏感衣物，建议提高换洗频率。");
  }

  score = Math.max(0, Math.min(score, 100));

  return {
    item_id: item.profile.item_id,
    priority_score: score,
    recommendation: recommendationText(score),
    reasons: dedupe(reasons),
  };
}

export function adviseAllFrequencies(
  items: WardrobeItemForPlan[],
  constraints: LaundryConstraints,
): FrequencyAdvice[] {
  return items
    .map((item) => adviseFrequency(item, constraints))
    .sort((a, b) => b.priority_score - a.priority_score);
}

/** Return item ids whose score meets or exceeds minScore. */
export function recommendedItemIds(
  items: WardrobeItemForPlan[],
  constraints: LaundryConstraints,
  minScore: number,
): string[] {
  return adviseAllFrequencies(items, constraints)
    .filter((advice) => advice.priority_score >= minScore)
    .map((advice) => advice.item_id);
}

// ─── helpers ────────────────────────────────────────────────────────────

function thresholdFor(text: string): number {
  const matches: number[] = [];
  for (const [term, threshold] of Object.entries(FREQUENCY_THRESHOLDS)) {
    if (text.includes(term)) matches.push(threshold);
  }
  if (!matches.length) return 4; // default threshold for unknown items
  return Math.min(...matches);
}

function riskPenalty(item: WardrobeItemForPlan): number {
  const relevant = Object.entries(item.profile.risks)
    .filter(([key]) => FREQUENCY_RISK_KEYS.has(key))
    .map(([, level]) => level);
  if (relevant.some((l) => l === "high")) return 15;
  if (relevant.some((l) => l === "medium")) return 8;
  const notes = item.user_notes.join(" ");
  if (["缩水", "掉色", "起球", "shrink", "bleed", "pill"].some((term) => notes.includes(term))) return 8;
  return 0;
}

function recommendationText(score: number): string {
  if (score >= 75) return "建议本次优先清洗";
  if (score >= 45) return "建议本次清洗";
  if (score >= 25) return "可视时间和机器情况决定是否清洗";
  return "可暂缓清洗";
}

function searchText(item: WardrobeItemForPlan): string {
  const p = item.profile;
  return [
    p.name,
    p.user_note,
    ...Object.keys(p.material_ratios),
    ...p.colors,
    ...p.care_forbidden,
    ...item.user_notes,
  ]
    .join(" ")
    .toLowerCase();
}

function containsAny(text: string, terms: Set<string>): boolean {
  for (const term of terms) {
    if (text.includes(term)) return true;
  }
  return false;
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}
