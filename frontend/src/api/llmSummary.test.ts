import { afterEach, describe, expect, it, vi } from "vitest";
import { computeRecommendedStartTime } from "./llmSummary";

describe("computeRecommendedStartTime", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses a valid pickup time to recommend the latest safe start", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T19:00:00.000+08:00"));

    expect(computeRecommendedStartTime(60, "22:30")).toBe("21:15");
  });

  it("falls back to soon when pickup time would already be too late", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T19:00:00.000+08:00"));

    expect(computeRecommendedStartTime(180, "20:00")).toBe("19:15");
  });

  it("does not roll invalid pickup time ranges into another day", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T19:00:00.000+08:00"));

    expect(computeRecommendedStartTime(60, "25:99")).toBe("19:15");
  });
});
