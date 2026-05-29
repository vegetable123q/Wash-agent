import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { defaultUserProfile, loadUserProfile, saveUserProfile } from "./userProfile";

const storageKey = "washmate.userProfile";

describe("userProfile", () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("persists explicit laundry budget and wait preferences", () => {
    const saved = saveUserProfile({
      ...defaultUserProfile,
      displayName: " 小徐 ",
      budgetYuan: 12.5,
      maxWaitMinutes: 8,
    });

    expect(saved).toMatchObject({
      displayName: "小徐",
      budgetYuan: 12.5,
      maxWaitMinutes: 8,
    });
    expect(loadUserProfile()).toMatchObject({
      budgetYuan: 12.5,
      maxWaitMinutes: 8,
    });
  });

  it("returns a copy of the default profile", () => {
    const loaded = loadUserProfile();

    loaded.displayName = "Mutated";

    expect(defaultUserProfile.displayName).toBe("");
    expect(loadUserProfile().displayName).toBe("");
  });

  it("normalizes missing or invalid laundry preferences to null", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        displayName: " 小徐 ",
        dormName: "南区21号楼",
        latestPickupTime: "22:00",
        allowDryer: true,
        budgetYuan: "0",
        maxWaitMinutes: "-5",
      }),
    );

    expect(loadUserProfile()).toMatchObject({
      displayName: "小徐",
      dormName: "南区21号楼",
      budgetYuan: null,
      maxWaitMinutes: null,
    });
  });

  it("normalizes string false dryer preference to false", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        allowDryer: "false",
      }),
    );

    expect(loadUserProfile().allowDryer).toBe(false);
  });

  it("normalizes invalid stored pickup time to the default", () => {
    localStorage.setItem(
      storageKey,
      JSON.stringify({
        latestPickupTime: "99:99",
      }),
    );

    expect(loadUserProfile().latestPickupTime).toBe(defaultUserProfile.latestPickupTime);
  });

  it("returns a normalized profile when localStorage is unavailable", () => {
    vi.stubGlobal("localStorage", undefined);

    const saved = saveUserProfile({
      ...defaultUserProfile,
      displayName: " Test User ",
      latestPickupTime: "99:99",
    });

    expect(saved).toMatchObject({
      displayName: "Test User",
      latestPickupTime: defaultUserProfile.latestPickupTime,
    });
  });
});
