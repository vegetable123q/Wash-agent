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
    colors: { type: "array", items: { type: "string" } },
    recommended_wash: { type: "string" },
    care_warnings: { type: "array", items: { type: "string" } },
    care_forbidden: { type: "array", items: { type: "string" } },
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
  if (!file.type.startsWith("image/")) {
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
          "只返回 JSON，字段为 is_clothing, name, category, material_ratios, colors, recommended_wash, care_warnings。",
          "不要输出店铺、价格、购买链接或营销文案。",
        ].join("\n"),
      },
      {
        inline_data: {
          mime_type: file.type,
          data: await fileToBase64(file),
        },
      },
    ],
    config,
    "image",
  );
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
          "只返回 JSON，字段为 is_clothing, name, category, material_ratios, colors, recommended_wash, care_warnings。",
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
        parts: [{ text: "You extract clothing care facts and return JSON only." }],
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
  const parsed = JSON.parse(text) as unknown;
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error("ModelHub recognition result must be a JSON object");
  }
  return parsed as Record<string, unknown>;
}

function normalizeRecognitionPayload(payload: Record<string, unknown>, source: RecognitionSource): ClothingRecognitionResult {
  const careWarnings = extractCareWarnings(payload);
  const careNote = careWarnings.length ? careWarnings.join("、") : "";
  const recommendedWash = stringValue(payload.recommended_wash);
  const note = [recommendedWash, careNote].filter(Boolean).join("；");

  const result = {
    name: stringValue(payload.name),
    material: materialText(payload.material_ratios),
    colors: Array.isArray(payload.colors) ? payload.colors.map(String).join(", ") : stringValue(payload.colors),
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
  const warnings: string[] = [];
  const careForbidden = payload.care_forbidden;
  if (Array.isArray(careForbidden)) {
    for (const item of careForbidden) {
      const text = String(item).trim();
      if (text) warnings.push(text);
    }
  }
  const careWarnings = payload.care_warnings;
  if (Array.isArray(careWarnings)) {
    for (const item of careWarnings) {
      const text = String(item).trim();
      if (text) warnings.push(text);
    }
  }
  return [...new Set(warnings)];
}

function materialText(value: unknown): string {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return "";
  }
  return Object.entries(value as Record<string, unknown>)
    .map(([material, ratio]) => {
      const numericRatio = typeof ratio === "number" ? ratio : Number(ratio);
      if (Number.isFinite(numericRatio) && numericRatio > 0 && numericRatio <= 1) {
        return `${material} ${Math.round(numericRatio * 100)}%`;
      }
      return material;
    })
    .join(", ");
}

function stringValue(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}
