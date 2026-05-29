import { describe, expect, it } from "vitest";
import { planLaundry } from "./laundryPlanner";
import type { CampusContext, LaundryConstraints, MachineInfo, WardrobeItemForPlan } from "./types";

describe("planLaundry", () => {
  it("keeps bedding separate while using an available standard washer", () => {
    const standardWasher: MachineInfo = {
      machine_id: "455514",
      location: "南区21号楼 一层",
      machine_type: "standard_washer",
      status: "available",
      remaining_minutes: null,
      price_yuan: null,
      modes: ["standard", "large"],
    };
    const context: CampusContext = {
      all_machines: [standardWasher],
      available_machines: [standardWasher],
      queue_estimates: [
        {
          machine_type: "standard_washer",
          total_count: 1,
          available_count: 1,
          running_count: 0,
          out_of_service_count: 0,
          unknown_count: 0,
          estimated_wait_minutes: 0,
        },
      ],
      weather: {},
      drying_context: {},
      pricing_rules: {
        wash_programs: {
          standard: { price_yuan: 3.5, duration_minutes: 40 },
          large: { price_yuan: 4, duration_minutes: 50 },
        },
        dryer_programs: {
          low: { price_yuan: 2, duration_minutes: 50 },
        },
      },
    };
    const item: WardrobeItemForPlan = {
      profile: {
        item_id: "bedding",
        name: "床单被套",
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
      wear_count_since_wash: 1,
      preferred_method: "machine_wash",
      user_notes: ["床品"],
    };
    const constraints: LaundryConstraints = {
      selected_item_ids: ["bedding"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: 10,
      budget_yuan: null,
    };

    const plan = planLaundry([item], constraints, context);

    expect(plan.buckets).toHaveLength(1);
    expect(plan.buckets[0]).toMatchObject({
      bucket_id: "large-bedding",
      machine_type: "standard_washer",
      program: "large",
    });
    expect(JSON.stringify(plan)).not.toContain("large_washer");
  });
});
