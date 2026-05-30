import { describe, expect, it } from "vitest";
import { estimatedWasherLoadCount, estimateLaundryLoadUnits, loadPercentForItems, splitItemsByLaundryLoad } from "./laundryLoad";

describe("laundryLoad", () => {
  it("estimates dresses as larger than default small garments", () => {
    const dress = { name: "赴云端连衣裙", category: "裙装" };

    expect(estimateLaundryLoadUnits(dress)).toBe(18);
    expect(loadPercentForItems([dress, dress, dress, dress, dress])).toBe(90);
  });

  it("does not match load terms inside unrelated English words", () => {
    expect(estimateLaundryLoadUnits({ name: "worksheet tee" })).toBe(10);
    expect(estimateLaundryLoadUnits({ name: "dressage tee" })).toBe(10);
    expect(estimateLaundryLoadUnits({ name: "downstream tee" })).toBe(10);
    expect(estimateLaundryLoadUnits({ name: "socket tee" })).toBe(10);
  });

  it("keeps nine ordinary garments in one washer load", () => {
    const items = Array.from({ length: 9 }, (_, index) => ({ name: `纯棉 T 恤 ${index + 1}` }));

    expect(loadPercentForItems(items)).toBe(90);
    expect(estimatedWasherLoadCount(items)).toBe(1);
    expect(splitItemsByLaundryLoad(items)).toHaveLength(1);
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

  it("keeps a near-full but valid washer load together", () => {
    const items = [
      { name: "CHOCOOLATE黑白拼接短袖上衣" },
      { name: "休闲短裤" },
      { name: "赴云端连衣裙" },
      { name: "黑色羽绒服/棉服" },
      { name: "袜子" },
    ];

    expect(loadPercentForItems(items)).toBe(87);
    expect(splitItemsByLaundryLoad(items).map((chunk) => chunk.map((item) => item.name))).toEqual([
      items.map((item) => item.name),
    ]);
  });
});
