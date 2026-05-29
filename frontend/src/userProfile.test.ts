import { describe, expect, it } from "vitest";
import { dormWithFloor, normalizeDormFloor } from "./userProfile";

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
