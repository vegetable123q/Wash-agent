import { beforeEach, describe, expect, it } from "vitest";
import { defaultUserProfile, loadUserProfile, saveUserProfile } from "./userProfile";

const storageKey = "washmate.userProfile";

describe("userProfile", () => {
  beforeEach(() => {
    localStorage.clear();
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
});
