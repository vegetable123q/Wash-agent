import { afterEach, describe, expect, it, vi } from "vitest";
import { bucketLabel, computeRecommendedStartTime, generatePlanSummary, generateRiskDescription, generateTodayAdvice } from "./llmSummary";
import { emptyModelHubConfig } from "./modelHubConfig";
import type { LaundryPlan } from "./types";

const configuredModelHub = {
  ...emptyModelHubConfig,
  apikey: "test-modelhub-key",
};

function modelHubTextResponse(text: string) {
  return {
    ok: true,
    json: async () => ({
      candidates: [{ content: { parts: [{ text }] } }],
    }),
  };
}

describe("computeRecommendedStartTime", () => {
  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
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

  it("hides invalid estimates in fallback plan summaries", async () => {
    const plan = {
      buckets: [
        {
          bucket_id: "light-standard",
          item_ids: ["tee-1"],
          wash_method: "machine_wash",
          machine_type: "standard_washer",
          program: "standard",
          detergent_ml: 24,
          use_laundry_bag: false,
          dry_method: "air_dry",
          warnings: [],
        },
      ],
      estimated_cost_yuan: Number.NaN,
      estimated_duration_minutes: 1.5,
      summary: "light standard wash",
      global_warnings: [],
    } satisfies LaundryPlan;

    const result = await generatePlanSummary(plan, emptyModelHubConfig);

    expect(result.source).toBe("fallback");
    expect(result.text).not.toMatch(/NaN|1\.5/);
  });

  it("hides invalid costs in fallback today advice", async () => {
    const plan = {
      buckets: [
        {
          bucket_id: "light-standard",
          item_ids: ["tee-1"],
          wash_method: "machine_wash",
          machine_type: "standard_washer",
          program: "standard",
          detergent_ml: 24,
          use_laundry_bag: false,
          dry_method: "air_dry",
          warnings: [],
        },
      ],
      estimated_cost_yuan: Number.NaN,
      estimated_duration_minutes: 40,
      summary: "light standard wash",
      global_warnings: [],
    } satisfies LaundryPlan;

    const result = await generateTodayAdvice(plan, undefined, undefined, emptyModelHubConfig);

    expect(result.source).toBe("fallback");
    expect(result.text).not.toContain("NaN");
  });

  it("sanitizes invalid plan estimates before sending ModelHub prompts", async () => {
    const fetchMock = vi.fn().mockResolvedValue(modelHubTextResponse("summary"));
    vi.stubGlobal("fetch", fetchMock);
    const plan = {
      buckets: [
        {
          bucket_id: "light-standard",
          item_ids: ["tee-1"],
          wash_method: "machine_wash",
          machine_type: "standard_washer",
          program: "standard",
          detergent_ml: 24,
          use_laundry_bag: false,
          dry_method: "air_dry",
          warnings: [],
        },
      ],
      estimated_cost_yuan: -1,
      estimated_duration_minutes: 1.5,
      summary: "light standard wash",
      global_warnings: [],
    } satisfies LaundryPlan;

    await generatePlanSummary(plan, configuredModelHub);

    const summaryBody = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const summaryPrompt = String(summaryBody.contents[0].parts[0].text);
    expect(summaryPrompt).not.toContain("\"cost\": -1");
    expect(summaryPrompt).not.toContain("1.5");

    await generateTodayAdvice({ ...plan, estimated_cost_yuan: Number.NaN }, undefined, undefined, configuredModelHub);

    const adviceBody = JSON.parse(String(fetchMock.mock.calls[1][1]?.body));
    const advicePrompt = String(adviceBody.contents[0].parts[0].text);
    expect(advicePrompt).not.toContain("NaN");
  });

  it("filters invalid material ratios from risk summaries and prompts", async () => {
    const materialRatios = { cotton: Number.NaN, wool: -0.2, silk: 0.4 };

    const fallback = await generateRiskDescription({ shrink: "high" }, "silk scarf", materialRatios, emptyModelHubConfig);

    expect(fallback.source).toBe("fallback");
    expect(fallback.text).not.toContain("NaN");
    expect(fallback.text).not.toContain("-20%");
    expect(fallback.text).toContain("silk 40%");

    const fetchMock = vi.fn().mockResolvedValue(modelHubTextResponse("risk summary"));
    vi.stubGlobal("fetch", fetchMock);

    await generateRiskDescription({ shrink: "high" }, "silk scarf", materialRatios, configuredModelHub);

    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    const prompt = String(body.contents[0].parts[0].text);
    expect(prompt).not.toContain("NaN");
    expect(prompt).not.toContain("-20%");
    expect(prompt).toContain("silk 40%");
  });
});
