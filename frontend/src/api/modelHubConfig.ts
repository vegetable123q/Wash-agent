export interface ModelHubConfig {
  baseUrl: string;
  apikey: string;
  model_name: string;
}

export const supportedModelNames = ["gemini-3.1-pro-preview"] as const;
export type SupportedModelName = (typeof supportedModelNames)[number];

export const emptyModelHubConfig: ModelHubConfig = {
  baseUrl: "https://modelhub.ailemac.com/v1beta",
  apikey: "",
  model_name: supportedModelNames[0],
};

const STORAGE_KEY = "washmate.modelHubConfig";
let inMemoryModelHubConfig: ModelHubConfig | null = null;

export function loadModelHubConfig(): ModelHubConfig {
  if (inMemoryModelHubConfig) {
    return inMemoryModelHubConfig;
  }
  if (typeof localStorage === "undefined") {
    return emptyModelHubConfig;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return emptyModelHubConfig;
  }
  try {
    return normalizeModelHubConfig(JSON.parse(raw));
  } catch {
    return emptyModelHubConfig;
  }
}

export function saveModelHubConfig(config: ModelHubConfig): ModelHubConfig {
  const normalized = normalizeModelHubConfig(config);
  inMemoryModelHubConfig = normalized;
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

export function clearModelHubConfig(): ModelHubConfig {
  inMemoryModelHubConfig = null;
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  return emptyModelHubConfig;
}

export function hasCompleteModelHubConfig(config: ModelHubConfig): boolean {
  return Boolean(hasHttpModelHubBaseUrl(config.baseUrl) && config.apikey && supportedModelNames.includes(config.model_name as SupportedModelName));
}

export function normalizeModelHubConfig(value: unknown): ModelHubConfig {
  const config = typeof value === "object" && value !== null ? (value as Partial<ModelHubConfig>) : {};
  return {
    baseUrl: normalizeModelHubBaseUrl(config.baseUrl),
    apikey: String(config.apikey ?? "").trim(),
    model_name: supportedModelNames.includes(config.model_name as SupportedModelName) ? String(config.model_name) : "",
  };
}

function normalizeModelHubBaseUrl(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  return text.replace(/\/+$/, "");
}

function hasHttpModelHubBaseUrl(value: string): boolean {
  const text = value.trim();
  if (!text) {
    return false;
  }
  try {
    const url = new URL(text);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
