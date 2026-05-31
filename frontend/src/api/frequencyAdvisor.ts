/**
 * Wash frequency recommendation logic.
 * Ported from backend/wardrobe/frequency_advisor.py so the APK is self-contained.
 */

import type { FrequencyAdvice, LaundryConstraints, RiskLevel, WardrobeItemForPlan } from "./types";

const DAY_MS = 24 * 60 * 60 * 1000;

const WEAR_COUNT_THRESHOLDS: Record<string, number> = {
  underwear: 1,
  sock: 1,
  sport: 1,
  sports: 1,
  towel: 3,
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
  jacket: 8,
  coat: 8,
  bedding: 2,
  sheet: 2,
  sheets: 2,
  duvet: 2,
  内衣: 1,
  贴身: 1,
  袜: 1,
  运动: 1,
  速干: 1,
  浴巾: 3,
  毛巾: 3,
  t恤: 2,
  "t 恤": 2,
  衬衫: 2,
  卫衣: 3,
  羊毛: 4,
  毛衣: 4,
  牛仔: 5,
  裤: 4,
  夹克: 8,
  外套: 8,
  床单: 2,
  被套: 2,
};

const DAY_CYCLE_THRESHOLDS: Record<string, number> = {
  underwear: 1,
  sock: 1,
  sport: 1,
  sports: 1,
  towel: 3,
  "t-shirt": 2,
  tee: 2,
  tshirt: 2,
  shirt: 2,
  hoodie: 7,
  sweater: 14,
  wool: 14,
  jeans: 7,
  denim: 7,
  pants: 7,
  jacket: 30,
  coat: 30,
  bedding: 14,
  sheet: 14,
  sheets: 14,
  duvet: 14,
  内衣: 1,
  贴身: 1,
  袜: 1,
  运动: 1,
  速干: 1,
  浴巾: 3,
  毛巾: 3,
  t恤: 2,
  "t 恤": 2,
  衬衫: 2,
  卫衣: 7,
  羊毛: 14,
  毛衣: 14,
  牛仔: 7,
  裤: 7,
  夹克: 30,
  外套: 30,
  床单: 14,
  被套: 14,
};

const DAY_CYCLE_TERMS = new Set([
  "towel", "浴巾", "毛巾", "hoodie", "sweater", "wool", "jeans", "denim", "pants", "jacket", "coat",
  "bedding", "sheet", "sheets", "duvet", "卫衣", "羊毛", "毛衣", "牛仔", "裤", "夹克", "外套", "床单", "被套",
]);
const LOW_FREQUENCY_TERMS = new Set(["jeans", "denim", "sweater", "wool", "jacket", "coat", "牛仔", "羊毛", "毛衣", "夹克", "外套"]);
const SPORT_TERMS = new Set(["sport", "sports", "运动", "速干", "sweat", "出汗"]);
const STAIN_TERMS = new Set(["stain", "污渍", "油渍"]);
const HYGIENE_TERMS = new Set(["underwear", "sock", "内衣", "贴身", "袜"]);
const FREQUENCY_RISK_KEYS = new Set(["shrink", "color_bleed", "deform", "pilling", "dryer_damage"]);

export function adviseFrequency(item: WardrobeItemForPlan, constraints: LaundryConstraints): FrequencyAdvice {
  const text = searchText(item);
  const wearThreshold = wearThresholdFor(text);
  const dayThreshold = dayThresholdFor(text);
  const wearCount = nonNegativeInteger(item.wear_count_since_wash);
  const urgentItemIds = new Set(constraints.urgent_item_ids.map((id) => id.trim()).filter(Boolean));
  const dayInfo = usageDayInfo(item);
  const dayDue = dayInfo != null && dayInfo.days >= dayThreshold;
  const wearDue = wearCount >= wearThreshold;
  const sportRelated = containsAny(text, SPORT_TERMS);
  const hygieneRelated = constraints.hygiene_sensitive && containsAny(text, HYGIENE_TERMS);
  const immediateUseBased = sportRelated || hygieneRelated;
  const cycleSensitive = containsAny(text, DAY_CYCLE_TERMS) || containsAny(text, LOW_FREQUENCY_TERMS);
  const reasons: string[] = [];
  let score = 0;

  if (dayInfo) {
    if (dayDue) {
      score += 45;
      reasons.push(`距离${dayInfo.basis}已 ${dayInfo.days} 天，达到建议清洗周期 ${dayThreshold} 天。`);
    } else {
      reasons.push(`距离${dayInfo.basis} ${dayInfo.days} 天，未达到建议清洗周期 ${dayThreshold} 天。`);
    }
  } else if (immediateUseBased && wearDue) {
    reasons.push(`贴身、运动或出汗类衣物已使用 ${wearCount} 次，建议及时清洗。`);
  } else if (cycleSensitive) {
    reasons.push(`这类衣物更适合按清洗周期判断，暂无上次洗涤或穿用日期；已使用 ${wearCount} 次仅作参考。`);
  } else if (wearDue) {
    reasons.push(`已穿 ${wearCount} 次，达到建议穿着上限 ${wearThreshold} 次。`);
  } else {
    reasons.push(`已穿 ${wearCount} 次，未达到建议穿着上限 ${wearThreshold} 次。`);
  }

  if (wearDue) {
    if (immediateUseBased) {
      score += 45;
    } else if (dayInfo || cycleSensitive) {
      score += 20;
    } else {
      score += 45;
    }
    if (dayInfo) {
      reasons.push(`已穿 ${wearCount} 次，达到建议穿着上限 ${wearThreshold} 次。`);
    }
  }

  if (urgentItemIds.has(item.profile.item_id)) {
    score += 25;
    reasons.push("该衣物被标记为本次急用，优先级提高。");
  }

  if (sportRelated) {
    score += 35;
    reasons.push("运动后或出汗后穿着，建议及时清洗。");
  }

  if (containsAny(text, STAIN_TERMS)) {
    score += 35;
    reasons.push("用户记录有明显污渍，建议本次优先处理。");
  }

  if (containsAny(text, LOW_FREQUENCY_TERMS) && !dayDue && wearCount < wearThreshold) {
    score -= 15;
    reasons.push("牛仔、羊毛或外套类衣物可适当少洗，减少褪色、缩水和变形。");
  }

  const penalty = riskPenalty(item);
  if (penalty) {
    score -= penalty;
    reasons.push("历史或抽取结果提示存在缩水、掉色、变形等风险，频率建议不会强行要求机洗。");
  }

  if (hygieneRelated) {
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
  validateUniqueItemIds(items);
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
  const safeMinScore = Number.isFinite(minScore) ? minScore : 0;
  return adviseAllFrequencies(items, constraints)
    .filter((advice) => advice.priority_score >= safeMinScore)
    .map((advice) => advice.item_id);
}

// ─── helpers ────────────────────────────────────────────────────────────

function wearThresholdFor(text: string): number {
  const matches: number[] = [];
  for (const [term, threshold] of Object.entries(WEAR_COUNT_THRESHOLDS)) {
    if (termMatches(text, term)) matches.push(threshold);
  }
  if (!matches.length) return 4; // default threshold for unknown items
  return Math.min(...matches);
}

function dayThresholdFor(text: string): number {
  const matches: number[] = [];
  for (const [term, threshold] of Object.entries(DAY_CYCLE_THRESHOLDS)) {
    if (termMatches(text, term)) matches.push(threshold);
  }
  if (!matches.length) return 7;
  return Math.min(...matches);
}

function usageDayInfo(item: WardrobeItemForPlan): { days: number; basis: string } | null {
  const firstWornAt = timestamp(item.first_worn_after_wash_at);
  if (firstWornAt != null) {
    return { days: elapsedDays(firstWornAt), basis: "本轮首次穿用" };
  }
  const lastWashedAt = timestamp(item.last_washed_at);
  if (lastWashedAt != null) {
    return { days: elapsedDays(lastWashedAt), basis: "上次洗涤" };
  }
  return null;
}

function timestamp(value: unknown): number | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

function elapsedDays(startTime: number): number {
  return Math.max(0, Math.floor((Date.now() - startTime) / DAY_MS));
}

function nonNegativeInteger(value: number): number {
  return Number.isFinite(value) && Number.isInteger(value) && value >= 0 ? value : 0;
}

function termMatches(text: string, term: string): boolean {
  if (/^[a-z0-9 -]+$/i.test(term)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(term)}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(term);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
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
    if (termMatches(text, term)) return true;
  }
  return false;
}

function dedupe(items: string[]): string[] {
  return [...new Set(items)];
}

function validateUniqueItemIds(items: WardrobeItemForPlan[]): void {
  const seen = new Set<string>();
  const duplicates: string[] = [];

  for (const item of items) {
    const itemId = item.profile.item_id;
    if (seen.has(itemId)) {
      duplicates.push(itemId);
    } else {
      seen.add(itemId);
    }
  }

  if (duplicates.length) {
    throw new Error(`items duplicate item_id: ${dedupe(duplicates).join(", ")}`);
  }
}
