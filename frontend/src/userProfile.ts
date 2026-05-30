export interface UserProfile {
  displayName: string;
  dormName: string;
  latestPickupTime: string;
  allowDryer: boolean;
  budgetYuan: number | null;
  maxWaitMinutes: number | null;
}

export const defaultUserProfile: UserProfile = {
  displayName: "",
  dormName: "",
  latestPickupTime: "22:30",
  allowDryer: false,
  budgetYuan: null,
  maxWaitMinutes: null,
};

const STORAGE_KEY = "washmate.userProfile";

export function loadUserProfile(): UserProfile {
  if (typeof localStorage === "undefined") {
    return defaultProfile();
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultProfile();
  }
  try {
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return defaultProfile();
  }
}

export function saveUserProfile(profile: UserProfile): UserProfile {
  const normalized = normalizeProfile(profile);
  if (typeof localStorage !== "undefined") {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  }
  return normalized;
}

function defaultProfile(): UserProfile {
  return { ...defaultUserProfile };
}

function normalizeProfile(value: unknown): UserProfile {
  const profile = typeof value === "object" && value !== null ? (value as Partial<UserProfile>) : {};
  return {
    displayName: String(profile.displayName ?? "").trim(),
    dormName: String(profile.dormName ?? "").trim(),
    latestPickupTime: normalizePickupTime(profile.latestPickupTime),
    allowDryer: booleanValue(profile.allowDryer),
    budgetYuan: nonNegativeNumberOrNull(profile.budgetYuan),
    maxWaitMinutes: nonNegativeIntegerOrNull(profile.maxWaitMinutes),
  };
}

export function isValidPickupTime(value: string): boolean {
  return pickupTimeParts(value.trim()) !== null;
}

function normalizePickupTime(value: unknown): string {
  const parts = pickupTimeParts(String(value ?? defaultUserProfile.latestPickupTime).trim());
  if (!parts) {
    return defaultUserProfile.latestPickupTime;
  }
  return `${String(parts.hour).padStart(2, "0")}:${String(parts.minute).padStart(2, "0")}`;
}

function pickupTimeParts(value: string): { hour: number; minute: number } | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  if (hour < 0 || hour > 23 || minute < 0 || minute > 59) {
    return null;
  }
  return { hour, minute };
}

function nonNegativeNumberOrNull(value: unknown): number | null {
  const numberValue = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof numberValue === "number" && Number.isFinite(numberValue) && numberValue >= 0 ? numberValue : null;
}

function nonNegativeIntegerOrNull(value: unknown): number | null {
  const numberValue = nonNegativeNumberOrNull(value);
  return numberValue != null && Number.isInteger(numberValue) ? numberValue : null;
}

function booleanValue(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "string") {
    return value.trim().toLowerCase() === "true";
  }
  return false;
}
