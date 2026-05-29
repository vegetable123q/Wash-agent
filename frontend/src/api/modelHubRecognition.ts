import { hasCompleteModelHubConfig, type ModelHubConfig } from "./modelHubConfig";

export interface ClothingRecognitionResult {
  name?: string;
  material?: string;
  colors?: string;
  note?: string;
}

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
        parts: [{ text: "You extract clothing care facts from images and return JSON only." }],
      },
      contents: [
        {
          role: "user",
          parts: [
            {
              text: [
                "请识别这件衣物的名称、主要材质、颜色和简短洗护建议。",
                "只返回 JSON，字段为 name, material_ratios, colors, recommended_wash。",
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
        },
      ],
      generationConfig: {
        temperature: 0,
        responseMimeType: "application/json",
      },
    }),
  });
  if (!response.ok) {
    throw new Error(`ModelHub image recognition failed: ${response.status}`);
  }
  const raw = await response.json();
  return normalizeRecognitionPayload(parseGeminiJsonText(raw));
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

function normalizeRecognitionPayload(payload: Record<string, unknown>): ClothingRecognitionResult {
  const careWarnings = extractCareWarnings(payload);
  const careNote = careWarnings.length ? careWarnings.join("、") : "";
  const recommendedWash = stringValue(payload.recommended_wash);
  const note = [recommendedWash, careNote].filter(Boolean).join("；");

  return {
    name: stringValue(payload.name),
    material: materialText(payload.material_ratios),
    colors: Array.isArray(payload.colors) ? payload.colors.map(String).join(", ") : stringValue(payload.colors),
    note,
  };
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
