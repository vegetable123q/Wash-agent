import { describe, expect, it } from "vitest";
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
  it("uses a T-shirt threshold for English tee names", () => {
    const advice = adviseFrequency(planItem({ name: "white cotton tee", wearCount: 2 }), constraints);

    expect(advice.priority_score).toBeGreaterThanOrEqual(45);
    expect(advice.reasons[0]).toContain("达到建议清洗阈值 2 次");
  });

  it("uses a bedding threshold for English sheet names", () => {
    const advice = adviseFrequency(planItem({ name: "cotton bed sheet", wearCount: 1 }), constraints);

    expect(advice.priority_score).toBeGreaterThanOrEqual(45);
    expect(advice.reasons[0]).toContain("达到建议清洗阈值 1 次");
  });

  it("does not match short English threshold terms inside unrelated words", () => {
    const advice = adviseFrequency(planItem({ name: "steel gray jacket", wearCount: 2 }), constraints);

    expect(advice.priority_score).toBe(0);
    expect(advice.reasons[0]).toContain("未达到建议清洗阈值 4 次");
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

function planItem({ itemId = "item-1", name, wearCount }: { itemId?: string; name: string; wearCount: number }): WardrobeItemForPlan {
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
  };
}
