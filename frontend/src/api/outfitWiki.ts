/**
 * LLM-powered outfit recommendation engine.
 * Generates daily outfit suggestions from wardrobe items, weather,
 * and historical outfit logs. Falls back to rule-based matching
 * when ModelHub is not configured.
 */

import { hasCompleteModelHubConfig, type ModelHubConfig } from "./modelHubConfig";
import type { ClothingPair, OutfitLog, OutfitRecommendation, WardrobeCategory, WardrobeSummaryItem, WeatherSnapshot } from "./types";

// ─── public types ───────────────────────────────────────────────────────

export interface OutfitWikiSummary {
  totalLogs: number;
  recentOutfits: OutfitLog[];
  topPairs: ClothingPair[];
  styleSummary: string;
  todayRecommendation: OutfitRecommendation | null;
}

export interface OutfitWikiResult {
  recommendation: OutfitRecommendation;
  source: "llm" | "fallback";
}

// ─── wardrobe item classification ──────────────────────────────────────

const TOP_CATEGORIES: WardrobeCategory[] = ["上衣"];
const BOTTOM_CATEGORIES: WardrobeCategory[] = ["裤装", "裙装"];
const OUTER_CATEGORIES: WardrobeCategory[] = ["外套"];

export function classifyWardrobeItems(items: WardrobeSummaryItem[]) {
  const tops: WardrobeSummaryItem[] = [];
  const bottoms: WardrobeSummaryItem[] = [];
  const outers: WardrobeSummaryItem[] = [];

  for (const item of items) {
    const category = item.category;
    if (category && TOP_CATEGORIES.includes(category)) {
      tops.push(item);
    } else if (category && BOTTOM_CATEGORIES.includes(category)) {
      bottoms.push(item);
    } else if (category && OUTER_CATEGORIES.includes(category)) {
      outers.push(item);
    } else {
      // Fallback: infer from name
      const name = item.name.toLowerCase();
      if (/裤|裙/.test(name)) {
        bottoms.push(item);
      } else if (/外套|夹克|羽绒|大衣|风衣|棉服|冲锋衣/.test(name)) {
        outers.push(item);
      } else if (/卫衣|t恤|t 恤|短袖|长袖|衬衫|毛衣|针织|背心|上衣|polo|衫|tee|shirt/.test(name)) {
        tops.push(item);
      }
    }
  }

  return { tops, bottoms, outers };
}

// ─── LLM recommendation ────────────────────────────────────────────────

export async function generateOutfitRecommendation(
  wardrobeItems: WardrobeSummaryItem[],
  weather: WeatherSnapshot | undefined,
  recentLogs: OutfitLog[],
  pairs: ClothingPair[],
  config: ModelHubConfig,
  dirtyItemIds?: string[],
): Promise<OutfitWikiResult> {
  if (!hasCompleteModelHubConfig(config)) {
    return { recommendation: fallbackRecommendation(wardrobeItems, weather, recentLogs, pairs, dirtyItemIds), source: "fallback" };
  }

  const available = filterAvailableItems(wardrobeItems, dirtyItemIds);
  const { tops, bottoms, outers } = classifyWardrobeItems(available);
  if (!tops.length || !bottoms.length) {
    return { recommendation: fallbackRecommendation(wardrobeItems, weather, recentLogs, pairs, dirtyItemIds), source: "fallback" };
  }

  try {
    const prompt = buildOutfitPrompt(tops, bottoms, outers, weather, recentLogs, pairs);
    const text = await callModelHub(
      prompt,
      "你是个人穿搭顾问。根据用户的衣柜、历史搭配偏好和今日天气，推荐最合适的穿衣组合。严格区分上衣和下衣。返回纯JSON，不要代码块包裹。",
      config,
    );
    const parsed = parseRecommendationJson(text, tops, bottoms, outers);
    return { recommendation: parsed, source: "llm" };
  } catch {
    return { recommendation: fallbackRecommendation(wardrobeItems, weather, recentLogs, pairs, dirtyItemIds), source: "fallback" };
  }
}

// ─── style summary ─────────────────────────────────────────────────────

export async function generateStyleSummary(
  recentLogs: OutfitLog[],
  wardrobeItems: WardrobeSummaryItem[],
  pairs: ClothingPair[],
  config: ModelHubConfig,
): Promise<{ text: string; source: "llm" | "fallback" }> {
  if (!hasCompleteModelHubConfig(config) || recentLogs.length < 3) {
    return { text: fallbackStyleSummary(recentLogs, wardrobeItems), source: "fallback" };
  }

  try {
    const nameMap = new Map(wardrobeItems.map((i) => [i.item_id, i.name]));
    const logDescriptions = recentLogs.slice(0, 14).map((log) => {
      const tops = log.top_ids.map((id) => nameMap.get(id) ?? id).join("、");
      const bottoms = log.bottom_ids.map((id) => nameMap.get(id) ?? id).join("、");
      return `${log.date}: ${tops} + ${bottoms}`;
    });
    const topPairNames = pairs.slice(0, 5).map((p) => {
      const a = nameMap.get(p.item_a) ?? p.item_a;
      const b = nameMap.get(p.item_b) ?? p.item_b;
      return `${a}+${b}(${p.co_wear_count}次)`;
    });

    const prompt = [
      "以下是用户近两周的穿搭记录：",
      ...logDescriptions,
      "",
      "高频搭配组合：" + topPairNames.join("、"),
      "",
      "请用1-2句中文总结用户的穿搭风格偏好，简洁自然，不要用列表或JSON。",
    ].join("\n");

    const text = await callModelHub(prompt, "你是穿搭风格分析助手，用简洁自然的中文回答。", config);
    return { text, source: "llm" };
  } catch {
    return { text: fallbackStyleSummary(recentLogs, wardrobeItems), source: "fallback" };
  }
}

// ─── filter available items ─────────────────────────────────────────────

/** Remove items in dirty basket or with very high wear count. */
export function filterAvailableItems(
  items: WardrobeSummaryItem[],
  dirtyItemIds?: string[],
): WardrobeSummaryItem[] {
  const dirtySet = new Set(dirtyItemIds ?? []);
  return items.filter((item) => {
    if (dirtySet.has(item.item_id)) return false;
    // Items worn 5+ times since last wash are due for laundry — exclude
    if (item.wear_count_since_wash >= 5) return false;
    return true;
  });
}

// ─── fallback recommendation ────────────────────────────────────────────

export function fallbackRecommendation(
  wardrobeItems: WardrobeSummaryItem[],
  weather: WeatherSnapshot | undefined,
  recentLogs: OutfitLog[],
  pairs: ClothingPair[],
  dirtyItemIds?: string[],
): OutfitRecommendation {
  const available = filterAvailableItems(wardrobeItems, dirtyItemIds);
  const { tops, bottoms, outers } = classifyWardrobeItems(available);

  if (!tops.length || !bottoms.length) {
    return {
      top_ids: [],
      bottom_ids: [],
      outer_ids: [],
      reason: "衣柜中还没有足够的上衣或下衣，请先添加衣物。",
      confidence: "low",
      match_score: 0,
    };
  }

  const temperature = weather?.current?.temperature_2m;
  const precipitation = weather?.current?.precipitation;

  // Try to find best pair from history
  const recentWornIds = new Set(recentLogs.slice(0, 2).flatMap((l) => [...l.top_ids, ...l.bottom_ids]));
  const availableTops = tops.filter((t) => !recentWornIds.has(t.item_id));
  const availableBottoms = bottoms.filter((b) => !recentWornIds.has(b.item_id));

  const pickTop = availableTops.length > 0 ? availableTops[0] : tops[0];
  const pickBottom = availableBottoms.length > 0 ? availableBottoms[0] : bottoms[0];

  // Check if this pair exists in history
  const existingPair = pairs.find(
    (p) =>
      (p.item_a === pickTop.item_id && p.item_b === pickBottom.item_id) ||
      (p.item_a === pickBottom.item_id && p.item_b === pickTop.item_id),
  );
  const pairCount = existingPair?.co_wear_count ?? 0;

  // Pick outer based on temperature
  let pickOuter: WardrobeSummaryItem | undefined;
  const reasons: string[] = [];

  if (temperature != null && temperature < 18 && outers.length > 0) {
    const outerWornIds = new Set(recentLogs.slice(0, 2).flatMap((l) => l.outer_ids));
    pickOuter = outers.find((o) => !outerWornIds.has(o.item_id)) ?? outers[0];
    reasons.push(`当前 ${temperature}°C 偏凉，建议搭配外套。`);
  }

  if (pairCount > 0) {
    reasons.push(`${pickTop.name} + ${pickBottom.name} 是你常用的搭配（共穿 ${pairCount} 次）。`);
  } else {
    reasons.push(`推荐 ${pickTop.name} 搭配 ${pickBottom.name}，尝试新的组合。`);
  }

  if (precipitation != null && precipitation > 0) {
    reasons.push("今天有降水，建议选择深色或不易显湿的衣物。");
  }

  const score = pairCount > 3 ? 85 : pairCount > 0 ? 65 : 45;

  return {
    top_ids: [pickTop.item_id],
    bottom_ids: [pickBottom.item_id],
    outer_ids: pickOuter ? [pickOuter.item_id] : [],
    reason: reasons.join(""),
    confidence: score >= 70 ? "high" : score >= 50 ? "medium" : "low",
    match_score: score,
  };
}

function fallbackStyleSummary(recentLogs: OutfitLog[], wardrobeItems: WardrobeSummaryItem[]): string {
  if (recentLogs.length === 0) {
    return "还没有穿搭记录，开始记录你的每日穿搭吧。";
  }
  const nameMap = new Map(wardrobeItems.map((i) => [i.item_id, i.name]));
  const topNames = recentLogs.flatMap((l) => l.top_ids.map((id) => nameMap.get(id) ?? id));
  const bottomNames = recentLogs.flatMap((l) => l.bottom_ids.map((id) => nameMap.get(id) ?? id));
  const topFreq = modeFrequency(topNames);
  const bottomFreq = modeFrequency(bottomNames);
  const topCount = new Set(topNames).size;
  const bottomCount = new Set(bottomNames).size;
  return `近 ${recentLogs.length} 天穿过 ${topCount} 件上衣、${bottomCount} 件下衣。最常穿上衣「${topFreq}」，下衣「${bottomFreq}」。`;
}

function modeFrequency(items: string[]): string {
  const counts = new Map<string, number>();
  for (const item of items) {
    counts.set(item, (counts.get(item) ?? 0) + 1);
  }
  let best = "";
  let bestCount = 0;
  for (const [item, count] of counts) {
    if (count > bestCount) {
      best = item;
      bestCount = count;
    }
  }
  return best || "—";
}

// ─── LLM helpers ───────────────────────────────────────────────────────

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

function buildOutfitPrompt(
  tops: WardrobeSummaryItem[],
  bottoms: WardrobeSummaryItem[],
  outers: WardrobeSummaryItem[],
  weather: WeatherSnapshot | undefined,
  recentLogs: OutfitLog[],
  pairs: ClothingPair[],
): string {
  const topList = tops.map((t) => ({ id: t.item_id, name: t.name, colors: t.colors }));
  const bottomList = bottoms.map((b) => ({ id: b.item_id, name: b.name, colors: b.colors }));
  const outerList = outers.map((o) => ({ id: o.item_id, name: o.name, colors: o.colors }));

  const weatherText = weather?.status === "live" && weather.current
    ? `温度 ${weather.current.temperature_2m}°C，湿度 ${weather.current.relative_humidity_2m}%，降水 ${weather.current.precipitation}mm`
    : "天气信息暂不可用";

  const recentText = recentLogs.slice(0, 7).map((log) => {
    const nameMap = new Map([...tops, ...bottoms, ...outers].map((i) => [i.item_id, i.name]));
    const tNames = log.top_ids.map((id) => nameMap.get(id) ?? id).join("、") || "无";
    const bNames = log.bottom_ids.map((id) => nameMap.get(id) ?? id).join("、") || "无";
    const oNames = log.outer_ids.map((id) => nameMap.get(id) ?? id).join("、") || "无";
    return `${log.date}: 上衣=${tNames}, 下衣=${bNames}, 外套=${oNames}`;
  });

  const pairText = pairs.slice(0, 5).map((p) => {
    const nameMap = new Map([...tops, ...bottoms, ...outers].map((i) => [i.item_id, i.name]));
    return `${nameMap.get(p.item_a) ?? p.item_a} + ${nameMap.get(p.item_b) ?? p.item_b} (${p.co_wear_count}次)`;
  });

  return [
    "请根据以下信息推荐今天的穿衣组合：",
    "",
    `今日天气：${weatherText}`,
    "",
    "衣柜上衣：",
    JSON.stringify(topList),
    "",
    "衣柜下衣：",
    JSON.stringify(bottomList),
    "",
    outerList.length ? `衣柜外套：\n${JSON.stringify(outerList)}\n` : "",
    "近7天穿搭记录：",
    ...recentText,
    "",
    pairText.length ? `高频搭配：${pairText.join("、")}` : "",
    "",
    "请返回严格JSON格式（不要代码块包裹）：",
    '{"top_ids":["item_id"],"bottom_ids":["item_id"],"outer_ids":[],"reason":"推荐理由","confidence":"high/medium/low","match_score":85}',
    "",
    "要求：",
    "1. top_ids只能从上衣列表中选择，bottom_ids只能从下衣列表中选择",
    "2. 避免推荐近2天穿过的衣物",
    "3. 根据天气决定是否需要外套",
    "4. reason用自然中文描述推荐理由",
  ].join("\n");
}

function parseRecommendationJson(
  text: string,
  tops: WardrobeSummaryItem[],
  bottoms: WardrobeSummaryItem[],
  outers: WardrobeSummaryItem[],
): OutfitRecommendation {
  // Strip code block markers if present
  const cleaned = text.replace(/^```(?:json)?\s*/i, "").replace(/\s*```\s*$/i, "").trim();
  const parsed = JSON.parse(cleaned);

  const validTopIds = new Set(tops.map((t) => t.item_id));
  const validBottomIds = new Set(bottoms.map((b) => b.item_id));
  const validOuterIds = new Set(outers.map((o) => o.item_id));

  const topIds = Array.isArray(parsed.top_ids)
    ? parsed.top_ids.filter((id: unknown) => typeof id === "string" && validTopIds.has(id))
    : [];
  const bottomIds = Array.isArray(parsed.bottom_ids)
    ? parsed.bottom_ids.filter((id: unknown) => typeof id === "string" && validBottomIds.has(id))
    : [];
  const outerIds = Array.isArray(parsed.outer_ids)
    ? parsed.outer_ids.filter((id: unknown) => typeof id === "string" && validOuterIds.has(id))
    : [];

  return {
    top_ids: topIds.length ? topIds : tops.length ? [tops[0].item_id] : [],
    bottom_ids: bottomIds.length ? bottomIds : bottoms.length ? [bottoms[0].item_id] : [],
    outer_ids: outerIds,
    reason: typeof parsed.reason === "string" ? parsed.reason : "推荐搭配。",
    confidence: ["high", "medium", "low"].includes(parsed.confidence) ? parsed.confidence : "medium",
    match_score: typeof parsed.match_score === "number" ? Math.min(100, Math.max(0, Math.round(parsed.match_score))) : 50,
  };
}
