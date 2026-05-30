/**
 * Clothing info extraction and care-label normalization.
 * Ported from backend/clothing_extraction/extractor.py and product_info.py
 * so the APK can normalize user input and LLM results without a Python backend.
 */

import type { ClothingProfile, RiskLevel, WardrobeItemForPlan, WashMethod } from "./types";

// ─── care label canonical sets ──────────────────────────────────────────

const CARE_WARNING_LABELS = new Set([
  "avoid_hot_water", "do_not_bleach", "do_not_dry_clean", "do_not_iron",
  "do_not_machine_wash", "do_not_tumble_dry", "do_not_wash",
  "dry_clean_only", "hand_wash_only", "low_temperature_only",
]);

const CARE_RECOMMENDATION_LABELS = new Set([
  "air_dry", "cold_wash", "flat_dry", "gentle_cycle",
  "use_laundry_bag", "wash_separately",
]);

const CARE_LABEL_ALIASES: Record<string, string> = {
  bleach: "do_not_bleach", no_bleach: "do_not_bleach", "no bleach": "do_not_bleach",
  not_bleach: "do_not_bleach", "不可漂白": "do_not_bleach",
  tumble_dry: "do_not_tumble_dry", no_tumble_dry: "do_not_tumble_dry",
  "no tumble dry": "do_not_tumble_dry", "do not tumble dry": "do_not_tumble_dry",
  not_tumble_dry: "do_not_tumble_dry", "不可烘干": "do_not_tumble_dry", "不能烘干": "do_not_tumble_dry",
  wash_with_hot_water: "avoid_hot_water", hot_wash: "avoid_hot_water", "hot water": "avoid_hot_water",
  "avoid hot water": "avoid_hot_water", "避免热水": "avoid_hot_water",
  "cold water": "cold_wash", "cold wash": "cold_wash",
  laundry_bag: "use_laundry_bag", "use laundry bag": "use_laundry_bag",
  use_laundry_net: "use_laundry_bag", "洗衣袋": "use_laundry_bag",
  separate_wash: "wash_separately", "wash separately": "wash_separately",
  "separate colors": "wash_separately", "分开洗": "wash_separately",
  "gentle wash": "gentle_cycle", gentle: "gentle_cycle", gentle_cycle_only: "gentle_cycle",
  "line dry": "air_dry", "hang dry": "air_dry", "dry in shade": "air_dry", "shade dry": "air_dry",
  "hand wash": "hand_wash_only", handwash: "hand_wash_only", "只能手洗": "hand_wash_only", "仅限手洗": "hand_wash_only",
  "no iron": "do_not_iron", no_iron: "do_not_iron", "不可熨烫": "do_not_iron",
  "no dry clean": "do_not_dry_clean", no_dry_clean: "do_not_dry_clean", "不可干洗": "do_not_dry_clean",
  "no machine wash": "do_not_machine_wash", no_machine_wash: "do_not_machine_wash",
  "不可机洗": "do_not_machine_wash", "不能机洗": "do_not_machine_wash", "不可以机洗": "do_not_machine_wash",
  "不建议机洗": "do_not_machine_wash", "不适合机洗": "do_not_machine_wash", "避免机洗": "do_not_machine_wash",
  "禁止机洗": "do_not_machine_wash", "非机洗": "do_not_machine_wash",
  "flat dry": "flat_dry", "dry flat": "flat_dry", "平摊晾干": "flat_dry",
};

// ─── public API ─────────────────────────────────────────────────────────

/** Build a ClothingProfile from raw user input (text mode, no LLM). */
export function buildProfileFromInput(params: {
  item_id: string;
  name: string;
  material_text: string;
  colors_text: string;
  user_note: string;
}): ClothingProfile {
  const materialRatios = parseMaterialRatios(params.material_text);
  const colors = splitUserList(params.colors_text);
  const careLabels = extractCareHints(params.name, params.material_text, params.user_note);
  const { warnings, recommendations } = splitCareLabels(careLabels);
  const risks = inferRisks(params.name, params.material_text, params.user_note, warnings);

  return {
    item_id: params.item_id,
    name: params.name,
    user_note: params.user_note,
    material_ratios: materialRatios,
    colors,
    care_warnings: warnings,
    care_recommendations: recommendations,
    care_forbidden: [...warnings, ...recommendations],
    care_symbols: {},
    risks,
    recommended_wash: inferRecommendedWash(warnings),
  };
}

/** Enhance a profile with LLM recognition results. */
export function applyRecognitionResult(
  profile: ClothingProfile,
  result: { name?: string; material?: string; colors?: string; note?: string },
): ClothingProfile {
  if (result.name) profile.name = result.name;
  if (result.note) profile.user_note = result.note;
  if (result.material) {
    const parsed = parseMaterialRatios(result.material);
    if (Object.keys(parsed).length) profile.material_ratios = parsed;
  }
  if (result.colors) {
    const parsed = splitUserList(result.colors);
    if (parsed.length) profile.colors = parsed;
  }
  // Re-derive risk and care from combined text
  const combinedNote = [profile.name, profile.user_note, Object.keys(profile.material_ratios).join(" ")].join(" ");
  const careLabels = extractCareHints(combinedNote, "", "");
  const { warnings, recommendations } = splitCareLabels(careLabels);
  if (warnings.length) profile.care_warnings = warnings;
  if (recommendations.length) profile.care_recommendations = recommendations;
  profile.care_forbidden = [...profile.care_warnings, ...profile.care_recommendations];
  profile.risks = {
    ...profile.risks,
    ...inferRisks(profile.name, Object.keys(profile.material_ratios).join(" "), profile.user_note, warnings),
  };
  return profile;
}

/** Convert a ClothingProfile to a WardrobeItemForPlan for the planner. */
export function toWardrobeItemForPlan(
  profile: ClothingProfile,
  wearCount: number,
  userNotes: string[],
): WardrobeItemForPlan {
  return {
    profile,
    wear_count_since_wash: wearCount,
    preferred_method: inferPreferredMethod(profile),
    user_notes: userNotes,
  };
}

/** Convert stored WardrobeSummaryItem data to WardrobeItemForPlan. */
export interface StoredWardrobeItem {
  item_id: string;
  name: string;
  user_note?: string;
  user_notes?: string[];
  wear_count_since_wash: number;
  wash_count: number;
  material_ratios: Record<string, number>;
  colors: string[];
  risks: Record<string, string>;
}

export function storedToPlanItem(item: StoredWardrobeItem): WardrobeItemForPlan {
  const profile: ClothingProfile = {
    item_id: item.item_id,
    name: item.name,
    user_note: item.user_note ?? "",
    material_ratios: item.material_ratios ?? {},
    colors: item.colors ?? [],
    care_warnings: [],
    care_recommendations: [],
    care_forbidden: [],
    care_symbols: {},
    risks: normalizeRisks(item.risks),
    recommended_wash: "",
  };
  return toWardrobeItemForPlan(profile, item.wear_count_since_wash, item.user_notes ?? []);
}

// ─── material parsing ───────────────────────────────────────────────────

function parseMaterialRatios(text: string): Record<string, number> {
  const materials = splitUserList(text);
  if (!materials.length) return {};

  const parsed: Record<string, number> = {};
  let sawExplicitRatio = false;
  for (const raw of materials) {
    const match = raw.match(/^(.+?)\s*(\d+(?:\.\d+)?)\s*%?\s*$/);
    if (match) {
      sawExplicitRatio = true;
      const name = match[1].trim().toLowerCase();
      let ratio = Number(match[2]);
      if (ratio > 1) ratio = ratio / 100;
      if (ratio > 0) parsed[name] = Math.min(ratio, 1);
    }
  }

  if (!Object.keys(parsed).length && sawExplicitRatio) return {};

  // If no explicit percentages, distribute equally
  if (!Object.keys(parsed).length) {
    const ratio = Number((1 / materials.length).toFixed(4));
    for (const m of materials) {
      parsed[m.trim().toLowerCase()] = ratio;
    }
  }
  return parsed;
}

// ─── care label extraction ──────────────────────────────────────────────

function extractCareHints(name: string, material: string, note: string): string[] {
  const combined = [name, material, note].join(" ").toLowerCase();
  const labels: string[] = [];
  for (const [alias, canonical] of Object.entries(CARE_LABEL_ALIASES)) {
    if (aliasMatches(combined, alias.toLowerCase())) {
      labels.push(canonical);
    }
  }
  return [...new Set(labels)];
}

function aliasMatches(text: string, alias: string): boolean {
  if (/^[a-z0-9 _-]+$/i.test(alias)) {
    return new RegExp(`(^|[^a-z0-9])${escapeRegExp(alias)}([^a-z0-9]|$)`).test(text);
  }
  return text.includes(alias);
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function splitCareLabels(labels: string[]): { warnings: string[]; recommendations: string[] } {
  const warnings: string[] = [];
  const recommendations: string[] = [];
  for (const label of labels) {
    if (CARE_WARNING_LABELS.has(label)) warnings.push(label);
    else if (CARE_RECOMMENDATION_LABELS.has(label)) recommendations.push(label);
  }
  return { warnings, recommendations };
}

// ─── risk inference ─────────────────────────────────────────────────────

function inferRisks(
  name: string,
  material: string,
  note: string,
  warnings: string[],
): Record<string, RiskLevel> {
  const risks: Record<string, RiskLevel> = {
    shrink: "unknown",
    color_bleed: "unknown",
    deform: "unknown",
    pilling: "unknown",
    dryer_damage: "unknown",
  };

  const text = [name, material, note].join(" ").toLowerCase();

  if (warnings.includes("avoid_hot_water")) {
    risks.shrink = "high";
  } else if (text.includes("缩水")) {
    risks.shrink = "medium";
  }
  if (text.includes("掉色") || text.includes("褪色") || warnings.includes("wash_separately")) risks.color_bleed = "high";
  if (text.includes("变形") || text.includes("羊毛") || text.includes("wool")) risks.deform = "high";
  if (text.includes("起球") || text.includes("pilling")) risks.pilling = "medium";
  if (warnings.includes("do_not_tumble_dry") || text.includes("不可烘干")) risks.dryer_damage = "high";

  // Material-based defaults
  const materialText = material.toLowerCase();
  if (materialText.includes("羊毛") || materialText.includes("wool")) {
    risks.shrink = "high";
    risks.deform = "high";
  }
  if (materialText.includes("牛仔") || materialText.includes("denim")) {
    risks.color_bleed = "medium";
  }

  return risks;
}

// ─── wash method inference ──────────────────────────────────────────────

function inferRecommendedWash(warnings: string[]): string {
  if (warnings.includes("do_not_wash")) return "do_not_wash";
  if (warnings.includes("dry_clean_only")) return "dry_clean";
  if (warnings.includes("hand_wash_only") || warnings.includes("do_not_machine_wash")) return "hand_wash";
  return "machine_wash";
}

function inferPreferredMethod(profile: ClothingProfile): WashMethod {
  const allLabels = [...profile.care_warnings, ...profile.care_forbidden];
  if (allLabels.includes("do_not_wash")) return "do_not_wash";
  if (allLabels.includes("dry_clean_only")) return "dry_clean";
  if (allLabels.includes("hand_wash_only") || allLabels.includes("do_not_machine_wash")) return "hand_wash";
  return inferRecommendedWash(profile.care_warnings) as WashMethod;
}

// ─── utilities ──────────────────────────────────────────────────────────

function normalizeRisks(risks: Record<string, string>): Record<string, RiskLevel> {
  const result: Record<string, RiskLevel> = {};
  for (const [key, value] of Object.entries(risks)) {
    const normalized = String(value).toLowerCase();
    if (["low", "medium", "high", "unknown"].includes(normalized)) {
      result[key] = normalized as RiskLevel;
    } else {
      result[key] = "unknown";
    }
  }
  return result;
}

function splitUserList(value: string): string[] {
  return value
    .split(/[,，、\n]+/)
    .map((part) => part.trim())
    .filter(Boolean);
}
