import { describe, expect, it } from "vitest";
import { estimateLaundryLoadUnits, loadPercentForItems } from "./laundryLoad";

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
});
