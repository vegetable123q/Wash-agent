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
    return defaultUserProfile;
  }
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return defaultUserProfile;
  }
  try {
    return normalizeProfile(JSON.parse(raw));
  } catch {
    return defaultUserProfile;
  }
}

export function saveUserProfile(profile: UserProfile): UserProfile {
  const normalized = normalizeProfile(profile);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
  return normalized;
}

function normalizeProfile(value: unknown): UserProfile {
  const profile = typeof value === "object" && value !== null ? (value as Partial<UserProfile>) : {};
  const latestPickupTime = String(profile.latestPickupTime ?? defaultUserProfile.latestPickupTime).trim();
  return {
    displayName: String(profile.displayName ?? "").trim(),
    dormName: String(profile.dormName ?? "").trim(),
    latestPickupTime: isValidPickupTime(latestPickupTime) ? latestPickupTime : defaultUserProfile.latestPickupTime,
    allowDryer: Boolean(profile.allowDryer),
    budgetYuan: positiveNumberOrNull(profile.budgetYuan),
    maxWaitMinutes: positiveNumberOrNull(profile.maxWaitMinutes),
  };
}

export function isValidPickupTime(value: string): boolean {
  const match = /^(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return false;
  }
  const hour = Number(match[1]);
  const minute = Number(match[2]);
  return hour >= 0 && hour <= 23 && minute >= 0 && minute <= 59;
}

function positiveNumberOrNull(value: unknown): number | null {
  const numberValue = typeof value === "string" && value.trim() ? Number(value) : value;
  return typeof numberValue === "number" && Number.isFinite(numberValue) && numberValue > 0 ? numberValue : null;
}
