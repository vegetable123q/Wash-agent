import { describe, expect, it } from "vitest";
import { defaultUserProfile, dormWithFloor, isValidPickupTime, loadUserProfile, normalizeDormFloor, saveUserProfile } from "./userProfile";

describe("normalizeDormFloor", () => {
  it("accepts only floors from 1 to 30", () => {
    expect(normalizeDormFloor("1")).toBe("1");
    expect(normalizeDormFloor("30")).toBe("30");
    expect(normalizeDormFloor("04")).toBe("4");
    expect(normalizeDormFloor("")).toBe("");
  });

  it("rejects floor formats outside the supported range", () => {
    expect(normalizeDormFloor("0")).toBeNull();
    expect(normalizeDormFloor("31")).toBeNull();
    expect(normalizeDormFloor("B1")).toBeNull();
    expect(normalizeDormFloor("4层")).toBeNull();
  });

  it("formats a dorm name with a normalized floor", () => {
    expect(dormWithFloor({ dormName: "南区21号楼", dormFloor: "04" })).toBe("南区21号楼 · 4层");
    expect(dormWithFloor({ dormName: "南区21号楼", dormFloor: "" })).toBe("南区21号楼");
  });
});

describe("user profile preferences", () => {
  it("normalizes pickup time, dryer flag, budget, and max wait", () => {
    localStorage.clear();

    const saved = saveUserProfile({
      ...defaultUserProfile,
      latestPickupTime: "7:05",
      allowDryer: true,
      budgetYuan: 8.5,
      maxWaitMinutes: 20,
    });

    expect(saved.latestPickupTime).toBe("07:05");
    expect(saved.allowDryer).toBe(true);
    expect(saved.budgetYuan).toBe(8.5);
    expect(saved.maxWaitMinutes).toBe(20);
    expect(loadUserProfile()).toMatchObject(saved);
  });

  it("falls back for invalid pickup and numeric preferences", () => {
    localStorage.clear();

    const saved = saveUserProfile({
      ...defaultUserProfile,
      latestPickupTime: "25:70",
      budgetYuan: -1,
      maxWaitMinutes: 2.5,
    });

    expect(saved.latestPickupTime).toBe("22:30");
    expect(saved.budgetYuan).toBeNull();
    expect(saved.maxWaitMinutes).toBeNull();
    expect(isValidPickupTime("23:59")).toBe(true);
    expect(isValidPickupTime("24:00")).toBe(false);
  });
});
