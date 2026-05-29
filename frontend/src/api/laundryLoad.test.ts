import { describe, expect, it } from "vitest";
import { estimatedWasherLoadCount, estimateLaundryLoadUnits, loadPercentForItems, splitItemsByLaundryLoad } from "./laundryLoad";

describe("laundryLoad", () => {
  it("estimates dresses as larger than default small garments", () => {
    const dress = { name: "赴云端连衣裙", category: "裙装" };

    expect(estimateLaundryLoadUnits(dress)).toBe(18);
    expect(loadPercentForItems([dress, dress, dress, dress, dress])).toBe(90);
  });

  it("does not match load terms inside unrelated English words", () => {
    expect(estimateLaundryLoadUnits({ name: "worksheet tee" })).toBe(12);
    expect(estimateLaundryLoadUnits({ name: "dressage tee" })).toBe(12);
    expect(estimateLaundryLoadUnits({ name: "downstream tee" })).toBe(12);
    expect(estimateLaundryLoadUnits({ name: "socket tee" })).toBe(12);
  });

  it("falls back to the default target for invalid washer load targets", () => {
    const items = [{ name: "tee" }];

    expect(estimatedWasherLoadCount(items, 0)).toBe(1);
    expect(Number.isFinite(estimatedWasherLoadCount(items, 0))).toBe(true);
  });

  it("falls back to the default target when splitting loads with invalid targets", () => {
    const items = [{ name: "hoodie" }, { name: "hoodie" }];

    expect(splitItemsByLaundryLoad(items, 0).map((chunk) => chunk.length)).toEqual([2]);
  });
});
