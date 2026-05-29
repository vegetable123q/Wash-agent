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

export function loadModelHubConfig(): ModelHubConfig {
  return emptyModelHubConfig;
}

export function saveModelHubConfig(config: ModelHubConfig): ModelHubConfig {
  return normalizeModelHubConfig(config);
}

export function clearModelHubConfig(): ModelHubConfig {
  return emptyModelHubConfig;
}

export function hasCompleteModelHubConfig(config: ModelHubConfig): boolean {
  return Boolean(config.baseUrl && config.apikey && supportedModelNames.includes(config.model_name as SupportedModelName));
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
