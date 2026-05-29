import { describe, expect, it } from "vitest";
import { planLaundry } from "./laundryPlanner";
import type { CampusContext, LaundryConstraints, MachineInfo, WardrobeItemForPlan } from "./types";

describe("planLaundry", () => {
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

  it("keeps bedding separate while using an available standard washer", () => {
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

  it("does not match bedding terms inside unrelated English words", () => {
    const item = standardItem("tee-1", "worksheet tee");
    const plan = planLaundry([item], {
      selected_item_ids: ["tee-1"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: 10,
      budget_yuan: null,
    }, context);

    expect(plan.buckets[0].bucket_id).toBe("light-standard");
    expect(plan.buckets[0].program).toBe("standard");
  });

  it("splits many same-color standard items across multiple washer loads", () => {
    const items: WardrobeItemForPlan[] = Array.from({ length: 12 }, (_, index) => ({
      profile: {
        item_id: `tee-${index + 1}`,
        name: `白色棉 T 恤 ${index + 1}`,
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
      user_notes: [],
    }));
    const constraints: LaundryConstraints = {
      selected_item_ids: items.map((item) => item.profile.item_id),
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: 10,
      budget_yuan: null,
    };

    const plan = planLaundry(items, constraints, context);

    expect(plan.buckets).toHaveLength(2);
    expect(plan.buckets.map((bucket) => bucket.bucket_id)).toEqual(["light-standard-1", "light-standard-2"]);
    expect(plan.buckets.every((bucket) => bucket.item_ids.length <= 7)).toBe(true);
    expect(plan.summary).toContain("2 个洗护批次");
  });

  it("falls back to air dry when dryer is allowed but no dryer is available", () => {
    const item = standardItem("tee-1", "白色棉 T 恤");
    const plan = planLaundry([item], {
      selected_item_ids: ["tee-1"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: true,
      hygiene_sensitive: true,
      max_wait_minutes: 10,
      budget_yuan: null,
    }, context);

    expect(plan.buckets[0]).toMatchObject({
      dry_method: "air_dry",
    });
    expect(plan.global_warnings.some((warning) => warning.includes("没有可用烘干机"))).toBe(true);
  });

  it("deduplicates selected item ids before planning", () => {
    const item = standardItem("tee-1", "白色棉 T 恤");
    const plan = planLaundry([item], {
      selected_item_ids: ["tee-1", "tee-1"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: 10,
      budget_yuan: null,
    }, context);

    expect(plan.buckets[0].item_ids).toEqual(["tee-1"]);
  });

  it("trims selected item ids before planning", () => {
    const item = standardItem("tee-1", "白色棉 T 恤");
    const plan = planLaundry([item], {
      selected_item_ids: [" tee-1 "],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: 10,
      budget_yuan: null,
    }, context);

    expect(plan.buckets[0].item_ids).toEqual(["tee-1"]);
  });
});

function standardItem(itemId: string, name: string): WardrobeItemForPlan {
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
    wear_count_since_wash: 1,
    preferred_method: "machine_wash",
    user_notes: [],
  };
}
