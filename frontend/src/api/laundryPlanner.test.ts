import { describe, expect, it } from "vitest";
import { planLaundry, recommendDrying } from "./laundryPlanner";
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
    // Wash plan defaults to air_dry; drying is deferred.
    expect(plan.buckets[0].dry_method).toBe("air_dry");
    expect(JSON.stringify(plan)).not.toContain("large_washer");
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

  it("prefers the available washer closest to the user's dorm floor", () => {
    const firstFloorWasher: MachineInfo = {
      machine_id: "first-floor",
      location: "南区21号楼 一层",
      machine_floor: 1,
      machine_type: "standard_washer",
      status: "available",
      remaining_minutes: null,
      price_yuan: null,
      modes: ["standard"],
    };
    const sixthFloorWasher: MachineInfo = {
      machine_id: "sixth-floor",
      location: "南区21号楼 六层",
      machine_floor: 6,
      machine_type: "standard_washer",
      status: "available",
      remaining_minutes: null,
      price_yuan: null,
      modes: ["standard"],
    };
    const floorContext: CampusContext = {
      all_machines: [firstFloorWasher, sixthFloorWasher],
      available_machines: [firstFloorWasher, sixthFloorWasher],
      queue_estimates: [],
      weather: {},
      drying_context: {},
      pricing_rules: {
        wash_programs: {
          standard: { price_yuan: 3.5, duration_minutes: 40 },
        },
        dryer_programs: {
          low: { price_yuan: 2, duration_minutes: 50 },
        },
      },
    };
    const item: WardrobeItemForPlan = {
      profile: {
        item_id: "shirt",
        name: "白色短袖",
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
    const constraints: LaundryConstraints = {
      selected_item_ids: ["shirt"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: 10,
      budget_yuan: null,
      preferred_machine_floor: 5,
    };

    const plan = planLaundry([item], constraints, floorContext);

    expect(plan.buckets[0]).toMatchObject({
      bucket_id: "light-standard",
      machine_id: "sixth-floor",
      machine_floor: 6,
    });
    expect(plan.global_warnings.join("\n")).toContain("推荐使用 sixth-floor");
  });
});

describe("recommendDrying", () => {
  const standardWasher: MachineInfo = {
    machine_id: "washer-1",
    location: "Dorm A",
    machine_type: "standard_washer",
    status: "available",
    remaining_minutes: null,
    price_yuan: null,
    modes: ["standard"],
  };
  const dryer: MachineInfo = {
    machine_id: "dryer-1",
    location: "Dorm A",
    machine_type: "dryer",
    status: "available",
    remaining_minutes: null,
    price_yuan: null,
    modes: ["low"],
  };
  const context: CampusContext = {
    all_machines: [standardWasher, dryer],
    available_machines: [standardWasher, dryer],
    queue_estimates: [],
    weather: {},
    drying_context: {},
    pricing_rules: {
      wash_programs: {
        standard: { price_yuan: 3.5, duration_minutes: 40 },
      },
      dryer_programs: {
        low: { price_yuan: 2, duration_minutes: 50 },
      },
    },
  };

  const safeItem: WardrobeItemForPlan = {
    profile: {
      item_id: "white-tee",
      name: "白色纯棉 T 恤",
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

  const woolItem: WardrobeItemForPlan = {
    profile: {
      item_id: "wool",
      name: "羊毛衫",
      user_note: "",
      material_ratios: { wool: 1 },
      colors: ["gray"],
      care_warnings: ["do_not_tumble_dry"],
      care_recommendations: [],
      care_forbidden: ["do_not_tumble_dry"],
      care_symbols: {},
      risks: { shrink: "high" },
      recommended_wash: "hand_wash",
    },
    wear_count_since_wash: 1,
    preferred_method: "hand_wash",
    user_notes: [],
  };

  it("assigns dryer to safe machine-wash buckets when allowDryer is true", () => {
    const plan = planLaundry([safeItem], {
      selected_item_ids: ["white-tee"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    // Wash plan defaults to air_dry.
    expect(plan.buckets[0].dry_method).toBe("air_dry");

    const drying = recommendDrying(plan.buckets, context, {
      allowDryer: true,
      items: [safeItem],
    });

    expect(drying.steps).toHaveLength(1);
    expect(drying.steps[0].dry_method).toBe("low_heat_dryer");
    expect(drying.steps[0].dryer_machine_id).toBe("dryer-1");
    expect(drying.estimated_cost_yuan).toBe(2);
  });

  it("keeps hand-wash items on air_dry even when allowDryer is true", () => {
    const plan = planLaundry([woolItem], {
      selected_item_ids: ["wool"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    const drying = recommendDrying(plan.buckets, context, {
      allowDryer: true,
      items: [woolItem],
    });

    const handWashStep = drying.steps.find((s) => s.bucket_id === "hand-wash");
    expect(handWashStep?.dry_method).toBe("air_dry");
    expect(handWashStep?.warnings.join(" ")).toContain("不可烘干");
  });

  it("falls back to air_dry when no dryer is available", () => {
    const noDryerContext = { ...context, available_machines: [standardWasher] };
    const plan = planLaundry([safeItem], {
      selected_item_ids: ["white-tee"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, noDryerContext);

    const drying = recommendDrying(plan.buckets, noDryerContext, {
      allowDryer: true,
      items: [safeItem],
    });

    expect(drying.steps[0].dry_method).toBe("air_dry");
    expect(drying.steps[0].warnings.join(" ")).toContain("没有可用烘干机");
  });
});
