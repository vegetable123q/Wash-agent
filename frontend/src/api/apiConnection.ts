export interface ApiConnectionConfig {
  baseUrl: string;
  apikey: string;
}

const STORAGE_KEY = "washmate.apiConnection";

export const emptyApiConnectionConfig: ApiConnectionConfig = {
  baseUrl: "",
  apikey: "",
};

export function loadApiConnectionConfig(): ApiConnectionConfig {
  if (typeof localStorage !== "undefined") {
    localStorage.removeItem(STORAGE_KEY);
  }
  return emptyApiConnectionConfig;
}

export function saveApiConnectionConfig(config: ApiConnectionConfig): ApiConnectionConfig {
  return normalizeApiConnectionConfig(config);
}

export function clearApiConnectionConfig(): ApiConnectionConfig {
  localStorage.removeItem(STORAGE_KEY);
  return emptyApiConnectionConfig;
}

export function hasCompleteApiConnectionConfig(config: ApiConnectionConfig): boolean {
  return Boolean(config.baseUrl && config.apikey);
}

export function normalizeApiConnectionConfig(value: unknown): ApiConnectionConfig {
  const config = typeof value === "object" && value !== null ? (value as Partial<ApiConnectionConfig>) : {};
  return {
    baseUrl: normalizeApiBaseUrl(config.baseUrl),
    apikey: String(config.apikey ?? "").trim(),
  };
}

function normalizeApiBaseUrl(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  return text.replace(/\/+$/, "");
}
