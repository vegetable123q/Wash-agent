import { afterEach, describe, expect, it, vi } from "vitest";
import { bucketLabel, computeRecommendedStartTime } from "./llmSummary";

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

  it("defaults invalid plan durations before applying the pickup deadline", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T19:00:00.000+08:00"));

    expect(computeRecommendedStartTime(-30, "22:30")).toBe("21:15");
    expect(computeRecommendedStartTime(1.5, "22:30")).toBe("21:15");
  });

  it("labels mixed standard buckets without leaking internal ids", () => {
    expect(bucketLabel("mixed-standard")).toBe("混色标准");
    expect(bucketLabel("mixed-standard-2")).toBe("混色标准");
  });
});
