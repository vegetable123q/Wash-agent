import { afterEach, describe, expect, it, vi } from "vitest";
import { adviseAllFrequencies, adviseFrequency, recommendedItemIds } from "./frequencyAdvisor";
import type { LaundryConstraints, WardrobeItemForPlan } from "./types";

const constraints: LaundryConstraints = {
  selected_item_ids: [],
  urgent_item_ids: [],
  allow_mixed_colors: false,
  allow_dryer: false,
  hygiene_sensitive: true,
  max_wait_minutes: null,
  budget_yuan: null,
};

describe("frequencyAdvisor", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("uses a T-shirt threshold for English tee names", () => {
    const advice = adviseFrequency(planItem({ name: "white cotton tee", wearCount: 2 }), constraints);

    expect(advice.priority_score).toBeGreaterThanOrEqual(45);
    expect(advice.reasons[0]).toContain("达到建议穿着上限 2 次");
  });

  it("uses a bedding threshold for English sheet names", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-31T12:00:00Z"));

    const advice = adviseFrequency(
      planItem({ name: "cotton bed sheet", wearCount: 1, firstWornAfterWashAt: "2026-05-17" }),
      constraints,
    );

    expect(advice.priority_score).toBeGreaterThanOrEqual(45);
    expect(advice.reasons[0]).toContain("达到建议清洗周期 14 天");
  });

  it("does not rush bedding just because it has been used once recently", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-31T12:00:00Z"));

    const advice = adviseFrequency(
      planItem({ name: "cotton bed sheet", wearCount: 1, firstWornAfterWashAt: "2026-05-28" }),
      constraints,
    );

    expect(advice.priority_score).toBeLessThan(45);
    expect(advice.reasons[0]).toContain("距离本轮首次穿用 3 天，未达到建议清洗周期 14 天");
  });

  it("prioritizes towels by day cycle even with a low wear count", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-31T12:00:00Z"));

    const advice = adviseFrequency(
      planItem({ name: "blue bath towel", wearCount: 1, firstWornAfterWashAt: "2026-05-26" }),
      constraints,
    );

    expect(advice.priority_score).toBeGreaterThanOrEqual(45);
    expect(advice.reasons[0]).toContain("距离本轮首次穿用已 5 天，达到建议清洗周期 3 天");
  });

  it("does not match short English threshold terms inside unrelated words", () => {
    const advice = adviseFrequency(planItem({ name: "steel gray jacket", wearCount: 2 }), constraints);

    expect(advice.priority_score).toBe(0);
    expect(advice.reasons[0]).toContain("暂无上次洗涤或穿用日期");
  });

  it("does not match sport terms inside unrelated English words", () => {
    const advice = adviseFrequency(planItem({ name: "transport jacket", wearCount: 0 }), constraints);

    expect(advice.priority_score).toBe(0);
  });

  it("normalizes negative wear counts before building reasons", () => {
    const advice = adviseFrequency(planItem({ name: "white cotton tee", wearCount: -1 }), constraints);

    expect(advice.reasons[0]).toContain("已穿 0 次");
    expect(advice.reasons[0]).not.toContain("-1");
  });

  it("normalizes fractional wear counts before scoring advice", () => {
    const advice = adviseFrequency(planItem({ name: "white cotton tee", wearCount: 2.5 }), constraints);

    expect(advice.priority_score).toBe(0);
  });

  it("trims urgent item ids before matching", () => {
    const advice = adviseFrequency(planItem({ name: "white cotton tee", wearCount: 0 }), {
      ...constraints,
      urgent_item_ids: [" item-1 "],
    });

    expect(advice.priority_score).toBeGreaterThanOrEqual(25);
  });

  it("rejects duplicate item ids before advising all frequencies", () => {
    expect(() =>
      adviseAllFrequencies(
        [
          planItem({ itemId: "item-1", name: "white cotton tee", wearCount: 2 }),
          planItem({ itemId: "item-1", name: "duplicate cotton tee", wearCount: 0 }),
        ],
        constraints,
      ),
    ).toThrow(/duplicate.*item-1/);
  });

  it("falls back to zero when recommended item min score is invalid", () => {
    const item = planItem({ name: "white cotton tee", wearCount: 2 });

    expect(recommendedItemIds([item], constraints, Number.NaN)).toEqual(["item-1"]);
  });
});

function planItem({
  itemId = "item-1",
  name,
  wearCount,
  lastWashedAt,
  firstWornAfterWashAt,
}: {
  itemId?: string;
  name: string;
  wearCount: number;
  lastWashedAt?: string;
  firstWornAfterWashAt?: string;
}): WardrobeItemForPlan {
  return {
    profile: {
      item_id: itemId,
      name,
      user_note: "",
      material_ratios: { cotton: 1 },
      colors: ["white"],
      care_warnings: [],
      care_recommendations: [],
      care_forbidden: [],
      care_symbols: {},
      risks: {},
      recommended_wash: "machine_wash",
    },
    wear_count_since_wash: wearCount,
    preferred_method: "machine_wash",
    user_notes: [],
    last_washed_at: lastWashedAt,
    first_worn_after_wash_at: firstWornAfterWashAt,
  };
}
