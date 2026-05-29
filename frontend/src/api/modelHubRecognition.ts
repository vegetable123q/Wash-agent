import { hasCompleteModelHubConfig, type ModelHubConfig } from "./modelHubConfig";
import type { WardrobeCategory } from "./types";

export interface ClothingRecognitionResult {
  name?: string;
  material?: string;
  colors?: string;
  note?: string;
  category?: WardrobeCategory;
}

type RecognitionSource = "image" | "text";
const modelCategoryValues = ["tops", "bottoms", "dresses", "outerwear", "underwear_socks", "bedding", "shoes_accessories", "other"];
const materialDisplayNames: Record<string, string> = {
  cotton: "棉",
  polyester: "聚酯纤维",
  nylon: "锦纶",
  polyamide: "锦纶",
  wool: "羊毛",
  cashmere: "羊绒",
  denim: "牛仔布",
  linen: "亚麻",
  silk: "真丝",
  spandex: "氨纶",
  elastane: "氨纶",
  acrylic: "腈纶",
  viscose: "粘胶纤维",
  rayon: "粘胶纤维",
  modal: "莫代尔",
  lyocell: "莱赛尔",
  down: "羽绒",
  feather: "羽毛",
  leather: "皮革",
  fleece: "摇粒绒",
};
const colorDisplayNames: Record<string, string> = {
  blue: "蓝色",
  gray: "灰色",
  grey: "灰色",
  black: "黑色",
  white: "白色",
  red: "红色",
  green: "绿色",
  yellow: "黄色",
  pink: "粉色",
  purple: "紫色",
  brown: "棕色",
  beige: "米色",
  navy: "藏青色",
  orange: "橙色",
  light: "浅色",
  dark: "深色",
  indigo: "靛蓝色",
};
const careDisplayNames: Record<string, string> = {
  gentle_cycle: "轻柔洗",
  delicate_cycle: "轻柔洗",
  delicate: "轻柔洗",
  cold_wash: "冷水洗",
  machine_wash_cold: "冷水机洗",
  machine_wash: "机洗",
  hand_wash: "手洗",
  hand_wash_only: "只能手洗",
  dry_clean: "干洗",
  dry_clean_only: "只能干洗",
  air_dry: "自然晾干",
  hang_dry: "悬挂晾干",
  line_dry: "悬挂晾干",
  low_heat: "低温",
  low_heat_dryer: "低温烘干",
  do_not_bleach: "不可漂白",
  no_bleach: "不可漂白",
  do_not_tumble_dry: "不可烘干",
  do_not_dry: "不可烘干",
  do_not_wash: "不可水洗",
  wash_separately: "分开洗",
  separate_colors: "深浅色分开",
  color_bleed: "可能掉色",
  shrinkage: "注意缩水",
  laundry_bag: "建议使用洗衣袋",
};
const recognitionResponseSchema = {
  type: "object",
  properties: {
    is_clothing: { type: "boolean" },
    name: { type: "string" },
    category: { type: "string", enum: modelCategoryValues },
    material_ratios: {
      type: "object",
      additionalProperties: {
        type: "number",
        minimum: 0,
        maximum: 1,
      },
    },
    material: { type: "string" },
    colors: { type: "array", items: { type: "string" } },
    recommended_wash: { type: "string" },
    care_warnings: { type: "array", items: { type: "string" } },
    care_forbidden: { type: "array", items: { type: "string" } },
    care_symbols: { type: "array", items: { type: "string" } },
    care_instructions: { type: "string" },
  },
  required: ["is_clothing"],
};

export async function recognizeClothingImage(
  file: File,
  config: ModelHubConfig,
): Promise<ClothingRecognitionResult> {
  if (!hasCompleteModelHubConfig(config)) {
    throw new Error("ModelHub baseUrl, apikey, and model_name are required for image recognition");
  }
  const mimeType = imageMimeType(file);
  if (!mimeType) {
    throw new Error(`Unsupported image type: ${file.type || file.name}`);
  }

  return recognizeClothing(
    [
      {
        text: [
          "请先判断图片中是否包含衣物、吊牌、洗护标签或可用于衣物洗护的商品图。",
          "如果无关，请返回 {\"is_clothing\": false}。",
          "如果相关，请识别衣物名称、主要材质、颜色和简短洗护建议。",
          "请额外判断衣物分类 category，只能从 tops, bottoms, dresses, outerwear, underwear_socks, bedding, shoes_accessories, other 中选择。",
          "除 category 枚举值外，name、material_ratios 的键、colors、recommended_wash、care_warnings 等用户可见内容请优先使用中文。",
          "只返回 JSON，字段为 is_clothing, name, category, material_ratios, material, colors, recommended_wash, care_warnings, care_symbols, care_instructions。",
          "不要输出店铺、价格、购买链接或营销文案。",
        ].join("\n"),
      },
      {
        inline_data: {
          mime_type: mimeType,
          data: await fileToBase64(file),
        },
      },
    ],
    config,
    "image",
  );
}

function imageMimeType(file: File): string | null {
  const explicitType = file.type.trim().toLowerCase();
  if (explicitType.startsWith("image/")) {
    return explicitType;
  }
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".gif")) return "image/gif";
  if (lowerName.endsWith(".heic")) return "image/heic";
  return null;
}

export async function recognizeClothingText(
  description: string,
  config: ModelHubConfig,
): Promise<ClothingRecognitionResult> {
  const trimmedDescription = description.trim();
  if (!hasCompleteModelHubConfig(config)) {
    throw new Error("ModelHub baseUrl, apikey, and model_name are required for text recognition");
  }
  if (!trimmedDescription) {
    throw new Error("衣物描述不能为空");
  }

  return recognizeClothing(
    [
      {
        text: [
          "请从用户的一大段衣物描述中抽取衣物名称、主要材质、颜色和洗护建议。",
          "如果文字没有描述任何衣物，请返回 {\"is_clothing\": false}。",
          "请额外判断衣物分类 category，只能从 tops, bottoms, dresses, outerwear, underwear_socks, bedding, shoes_accessories, other 中选择。",
          "除 category 枚举值外，name、material_ratios 的键、colors、recommended_wash、care_warnings 等用户可见内容请优先使用中文。",
          "只返回 JSON，字段为 is_clothing, name, category, material_ratios, material, colors, recommended_wash, care_warnings, care_symbols, care_instructions。",
          "用户描述：",
          trimmedDescription,
        ].join("\n"),
      },
    ],
    config,
    "text",
  );
}

async function recognizeClothing(
  parts: Array<Record<string, unknown>>,
  config: ModelHubConfig,
  source: RecognitionSource,
): Promise<ClothingRecognitionResult> {
  const endpoint = `${config.baseUrl.replace(/\/+$/, "")}/models/${encodeURIComponent(config.model_name)}:generateContent`;
  const headers = new Headers({
    "Content-Type": "application/json",
    "x-goog-api-key": config.apikey,
  });
  const response = await fetch(endpoint, {
    method: "POST",
    headers,
    body: JSON.stringify({
      systemInstruction: {
        parts: [{ text: "你是衣物洗护信息抽取器。只返回 JSON；除 category 枚举值外，所有用户可见字段默认使用中文。" }],
      },
      contents: [
        {
          role: "user",
          parts,
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
        responseSchema: recognitionResponseSchema,
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`ModelHub recognition failed: ${response.status}`);
  }
  const raw = await response.json();
  return normalizeRecognitionPayload(parseGeminiJsonText(raw), source);
}

async function fileToBase64(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
}

function parseGeminiJsonText(raw: unknown): Record<string, unknown> {
  const candidate = (raw as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> }).candidates?.[0];
  const text = candidate?.content?.parts?.map((part) => part.text ?? "").join("") ?? "";
  if (!text.trim()) {
    throw new Error("ModelHub returned no recognition text");
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("ModelHub returned invalid recognition JSON");
  }
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("ModelHub recognition result must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function normalizeRecognitionPayload(payload: Record<string, unknown>, source: RecognitionSource): ClothingRecognitionResult {
  const careWarnings = extractCareWarnings(payload);
  const careNote = careWarnings.length ? careWarnings.join("、") : "";
  const recommendedWash = translateCareText(stringValue(payload.recommended_wash));
  const note = [recommendedWash, careNote].filter(Boolean).join("；");

  const result = {
    name: stringValue(payload.name),
    material: materialText(firstValue(
      payload.material_ratios,
      payload.materials,
      payload.material,
      payload.material_text,
      payload.fabric,
      payload.composition,
    )),
    colors: colorsText(payload.colors),
    note,
    category: normalizeWardrobeCategory(payload.category),
  };

  const hasExtractedFields = Boolean(result.name || result.material || result.colors || result.note);
  if (payload.is_clothing === false || !hasExtractedFields) {
    if (source === "image") {
      throw new Error("没有识别到衣物，请上传包含衣物、吊牌或洗护标签的图片。");
    }
    throw new Error("没有从文字中提取到衣物信息，请补充衣物名称、材质或洗护要求。");
  }

  return result;
}

function normalizeWardrobeCategory(value: unknown): WardrobeCategory | undefined {
  const raw = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (!raw) return undefined;
  const categoryMap: Record<string, WardrobeCategory> = {
    tops: "上衣",
    top: "上衣",
    shirt: "上衣",
    tee: "上衣",
    hoodie: "上衣",
    上衣: "上衣",
    bottoms: "裤装",
    bottom: "裤装",
    pants: "裤装",
    trousers: "裤装",
    jeans: "裤装",
    shorts: "裤装",
    裤装: "裤装",
    dresses: "裙装",
    dress: "裙装",
    skirt: "裙装",
    裙装: "裙装",
    outerwear: "外套",
    coat: "外套",
    jacket: "外套",
    down: "外套",
    外套: "外套",
    underwear_socks: "内衣袜子",
    underwear: "内衣袜子",
    socks: "内衣袜子",
    sock: "内衣袜子",
    内衣袜子: "内衣袜子",
    bedding: "床品",
    sheet: "床品",
    sheets: "床品",
    床品: "床品",
    shoes_accessories: "鞋包配饰",
    shoes: "鞋包配饰",
    accessories: "鞋包配饰",
    鞋包配饰: "鞋包配饰",
    other: "其他",
    其他: "其他",
  };
  return categoryMap[raw];
}

/** Extract care warnings from LLM payload for richer risk inference. */
function extractCareWarnings(payload: Record<string, unknown>): string[] {
  const warnings = [
    ...careTexts(payload.care_forbidden),
    ...careTexts(payload.care_warnings),
    ...careTexts(payload.care_symbols),
    ...careTexts(payload.care_instructions),
    ...careTexts(payload.washing_label),
    ...careTexts(payload.washing_instructions),
    ...careTexts(payload.care_label),
    ...careTexts(payload.laundry_label),
  ].map(translateCareText);
  return [...new Set(warnings)];
}

function materialText(value: unknown): string {
  if (!value) {
    return "";
  }

  if (typeof value === "string") {
    return materialStringText(value);
  }

  if (Array.isArray(value)) {
    return value.map(materialEntryText).filter(Boolean).join("、");
  }

  if (typeof value === "object") {
    return Object.entries(value as Record<string, unknown>)
      .map(([material, ratio]) => materialWithRatioText(material, ratio))
      .filter(Boolean)
      .join("、");
  }

  return "";
}

function materialStringText(value: string): string {
  return value
    .split(/[、,，/;；]+/)
    .map((part) => materialEntryText(part))
    .filter(Boolean)
    .join("、");
}

function materialEntryText(value: unknown): string {
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return "";
    const nameFirst = trimmed.match(/^(.+?)\s*(\d+(?:\.\d+)?)\s*%?$/);
    if (nameFirst) {
      return materialWithRatioText(nameFirst[1], nameFirst[2]);
    }
    const percentFirst = trimmed.match(/^(\d+(?:\.\d+)?)\s*%?\s*(.+)$/);
    if (percentFirst) {
      return materialWithRatioText(percentFirst[2], percentFirst[1]);
    }
    return translateMaterialName(trimmed);
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    const record = value as Record<string, unknown>;
    const name = firstValue(record.name, record.material, record.label);
    if (typeof name === "string") {
      return materialWithRatioText(name, firstValue(record.ratio, record.percent, record.percentage, record.value));
    }
  }

  return "";
}

function materialWithRatioText(material: string, ratio: unknown): string {
  const name = translateMaterialName(material);
  const numericRatio = typeof ratio === "number" ? ratio : Number(ratio);
  if (Number.isFinite(numericRatio) && numericRatio > 0) {
    const normalizedRatio = numericRatio > 1 ? numericRatio / 100 : numericRatio;
    if (normalizedRatio > 0 && normalizedRatio <= 1) {
      return `${name} ${Math.round(normalizedRatio * 100)}%`;
    }
  }
  return name;
}

function careTexts(value: unknown): string[] {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.flatMap(careTexts);
  }
  if (typeof value === "object") {
    return Object.values(value as Record<string, unknown>).flatMap(careTexts);
  }
  return String(value)
    .split(/[、,，;；\n]+/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function firstValue(...values: unknown[]): unknown {
  for (const value of values) {
    if (typeof value === "string") {
      if (value.trim()) return value;
      continue;
    }
    if (Array.isArray(value)) {
      if (value.length) return value;
      continue;
    }
    if (value && typeof value === "object") {
      if (Object.keys(value).length) return value;
      continue;
    }
    if (typeof value === "number") {
      return value;
    }
  }
  return undefined;
}
function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function colorsText(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map(colorsText).filter(Boolean).join("、");
  }
  if (value && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).map(colorsText).filter(Boolean).join("、");
  }
  return stringValue(value)
    .split(/[、,，/]+/)
    .map((item) => translateColorName(item))
    .filter(Boolean)
    .join("、");
}

function translateMaterialName(value: string): string {
  const trimmed = value.trim();
  return materialDisplayNames[termKey(trimmed)] ?? trimmed;
}

function translateColorName(value: string): string {
  const trimmed = value.trim();
  return colorDisplayNames[termKey(trimmed)] ?? trimmed;
}

function translateCareText(value: string): string {
  const trimmed = value.trim();
  return careDisplayNames[termKey(trimmed)] ?? trimmed;
}

function termKey(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, "_").replace(/-/g, "_");
}
