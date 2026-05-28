export interface ApiConnectionConfig {
  apiBaseUrl: string;
  apiToken: string;
}

const STORAGE_KEY = "washmate.apiConnection";

export const emptyApiConnectionConfig: ApiConnectionConfig = {
  apiBaseUrl: "",
  apiToken: "",
};

export function loadApiConnectionConfig(): ApiConnectionConfig {
  if (typeof localStorage === "undefined") {
    return emptyApiConnectionConfig;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return emptyApiConnectionConfig;
  }
  try {
    return normalizeApiConnectionConfig(JSON.parse(raw));
  } catch {
    return emptyApiConnectionConfig;
  }
}

export function saveApiConnectionConfig(config: ApiConnectionConfig): ApiConnectionConfig {
  const normalized = normalizeApiConnectionConfig(config);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

export function clearApiConnectionConfig(): ApiConnectionConfig {
  localStorage.removeItem(STORAGE_KEY);
  return emptyApiConnectionConfig;
}

export function hasCompleteApiConnectionConfig(config: ApiConnectionConfig): boolean {
  return Boolean(config.apiBaseUrl && config.apiToken);
}

export function normalizeApiConnectionConfig(value: unknown): ApiConnectionConfig {
  const config = typeof value === "object" && value !== null ? (value as Partial<ApiConnectionConfig>) : {};
  return {
    apiBaseUrl: normalizeApiBaseUrl(config.apiBaseUrl),
    apiToken: String(config.apiToken ?? "").trim(),
  };
}

function normalizeApiBaseUrl(value: unknown): string {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  return text.replace(/\/+$/, "");
}
