import { describe, expect, it } from "vitest";
import { adviseFrequency } from "./frequencyAdvisor";
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
});

function planItem({ name, wearCount }: { name: string; wearCount: number }): WardrobeItemForPlan {
  return {
    profile: {
      item_id: "item-1",
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
