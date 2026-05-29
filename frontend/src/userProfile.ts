export interface UserProfile {
  displayName: string;
  dormName: string;
  dormFloor?: string;
  latestPickupTime: string;
  allowDryer: boolean;
}

export const defaultUserProfile: UserProfile = {
  displayName: "",
  dormName: "",
  dormFloor: "",
  latestPickupTime: "22:30",
  allowDryer: false,
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
  const dormFloor = normalizeDormFloor(profile.dormFloor);
  return {
    displayName: String(profile.displayName ?? "").trim(),
    dormName: String(profile.dormName ?? "").trim(),
    dormFloor: dormFloor ?? "",
    latestPickupTime: String(profile.latestPickupTime ?? defaultUserProfile.latestPickupTime).trim(),
    allowDryer: Boolean(profile.allowDryer),
  };
}

export function normalizeDormFloor(value: unknown): string | null {
  const text = String(value ?? "").trim();
  if (!text) {
    return "";
  }
  if (!/^\d{1,2}$/.test(text)) {
    return null;
  }
  const floor = Number(text);
  if (!Number.isInteger(floor) || floor < 1 || floor > 30) {
    return null;
  }
  return String(floor);
}

export function dormWithFloor(profile?: Pick<UserProfile, "dormName" | "dormFloor"> | null): string {
  const dormName = String(profile?.dormName ?? "").trim();
  if (!dormName) {
    return "";
  }
  const dormFloor = normalizeDormFloor(profile?.dormFloor);
  return dormFloor ? `${dormName} · ${dormFloor}层` : dormName;
}
