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

  it("uses an available washer with unknown modes for standard wash programs", () => {
    const modeAgnosticWasher: MachineInfo = {
      ...standardWasher,
      machine_id: "mode-agnostic",
      modes: [],
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
      max_wait_minutes: null,
      budget_yuan: null,
    };

    const plan = planLaundry([item], constraints, {
      ...context,
      all_machines: [modeAgnosticWasher],
      available_machines: [modeAgnosticWasher],
    });

    expect(plan.buckets[0]).toMatchObject({
      bucket_id: "light-standard",
      machine_id: "mode-agnostic",
      program: "standard",
    });
    expect(plan.global_warnings).not.toContain("没有空闲洗衣机");
  });

  it("does not treat dry-clean prohibitions as dry-clean-only advice", () => {
    const item: WardrobeItemForPlan = {
      profile: {
        item_id: "printed-tee",
        name: "印花短袖",
        user_note: "干洗：不可干洗(推断)",
        material_ratios: { cotton: 1 },
        colors: ["white"],
        care_warnings: ["不可干洗(推断)"],
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
      selected_item_ids: ["printed-tee"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    };

    const plan = planLaundry([item], constraints, context);

    expect(plan.buckets).toHaveLength(1);
    expect(plan.buckets[0]).toMatchObject({
      bucket_id: "light-standard",
      wash_method: "machine_wash",
      machine_id: "455514",
    });
    expect(plan.buckets[0].warnings).not.toContain("该批次建议送专业干洗，不进入共享洗衣机。");
  });

  it("keeps a bucket unassigned when machine modes are explicitly incompatible", () => {
    const largeOnlyWasher: MachineInfo = {
      ...standardWasher,
      machine_id: "large-only",
      modes: ["large"],
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
      max_wait_minutes: null,
      budget_yuan: null,
    };

    const plan = planLaundry([item], constraints, {
      ...context,
      all_machines: [largeOnlyWasher],
      available_machines: [largeOnlyWasher],
    });

    expect(plan.buckets[0].machine_id).toBeUndefined();
    expect(plan.buckets[0].warnings).toContain("没有空闲洗衣机");
    expect(plan.estimated_cost_yuan).toBeNull();
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
    expect(plan.buckets.map((bucket) => bucket.item_ids.length)).toEqual([10, 2]);
    expect(plan.buckets[0].machine_id).toBe("455514");
    expect(plan.buckets[1].machine_id).toBeUndefined();
    expect(plan.buckets[1].warnings).toContain("没有空闲洗衣机");
    expect(plan.estimated_cost_yuan).toBeNull();
    expect(plan.estimated_duration_minutes).toBeNull();
    expect(plan.summary).toContain("2 个洗护批次");
  });

  it("keeps a near-full dark washer load together instead of making a sock-only bucket", () => {
    const items: WardrobeItemForPlan[] = [
      "CHOCOOLATE黑白拼接短袖上衣",
      "休闲短裤",
      "赴云端连衣裙",
      "黑色羽绒服/棉服",
      "袜子",
    ].map((name, index) => ({
      profile: {
        item_id: `dark-item-${index + 1}`,
        name,
        user_note: "",
        material_ratios: { cotton: 1 },
        colors: ["black"],
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

    const plan = planLaundry(items, {
      selected_item_ids: items.map((item) => item.profile.item_id),
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: 10,
      budget_yuan: null,
    }, context);

    expect(plan.buckets).toHaveLength(1);
    expect(plan.buckets[0]).toMatchObject({
      bucket_id: "dark-standard",
      item_ids: items.map((item) => item.profile.item_id),
      machine_id: "455514",
    });
  });

  it("keeps machine-wash buckets when no washer is available", () => {
    const unavailableContext: CampusContext = {
      ...context,
      available_machines: [],
    };
    const item: WardrobeItemForPlan = {
      profile: {
        item_id: "hoodie",
        name: "黑色连帽卫衣",
        user_note: "",
        material_ratios: { cotton: 1 },
        colors: ["black"],
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
      selected_item_ids: ["hoodie"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    };

    const plan = planLaundry([item], constraints, unavailableContext);

    expect(plan.buckets).toHaveLength(1);
    expect(plan.buckets[0]).toMatchObject({
      bucket_id: "dark-standard",
      machine_type: "standard_washer",
      program: "standard",
    });
    expect(plan.buckets[0].machine_id).toBeUndefined();
    expect(plan.buckets[0].warnings).toContain("没有空闲洗衣机");
  });

  it("keeps the wash bucket when dryer assignment is unavailable", () => {
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
      allow_dryer: true,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    };

    const plan = planLaundry([item], constraints, context);
    const drying = recommendDrying(plan.buckets, context, {
      allowDryer: true,
      items: [item],
    });

    expect(plan.buckets).toHaveLength(1);
    expect(plan.buckets[0].machine_id).toBe("455514");
    expect(plan.estimated_cost_yuan).toBe(3.5);
    expect(plan.estimated_duration_minutes).toBe(40);
    expect(drying.steps[0].dry_method).toBe("air_dry");
    expect(drying.steps[0].warnings).toContain("没有空闲烘干机");
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
      location: "南区21号楼 六层 2号",
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
    expect(plan.global_warnings.join("\n")).toContain("推荐使用南区21号楼六层2号洗衣机，程序标准洗。");
    expect(plan.global_warnings.join("\n")).not.toContain("sixth-floor");
  });

  it("uses a short numeric machine suffix when location only has the floor", () => {
    const washer: MachineInfo = {
      machine_id: "clever-nq21-6",
      location: "南区21号楼 六层",
      machine_floor: 6,
      machine_type: "standard_washer",
      status: "available",
      remaining_minutes: null,
      price_yuan: null,
      modes: ["standard"],
    };
    const contextWithFloorOnlyLocation: CampusContext = {
      all_machines: [washer],
      available_machines: [washer],
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

    const plan = planLaundry([item], {
      selected_item_ids: ["shirt"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
      preferred_machine_floor: null,
    }, contextWithFloorOnlyLocation);

    const warningText = plan.global_warnings.join("\n");
    expect(warningText).toContain("推荐使用南区21号楼六层6号洗衣机，程序标准洗。");
    expect(warningText).not.toContain("clever-nq21-6");
  });

  it("uses the physical washer number from location when it is present", () => {
    const washer: MachineInfo = {
      machine_id: "85702265",
      location: "紫荆16号楼 清华大学紫荆16号楼6层6号",
      machine_floor: 6,
      machine_type: "standard_washer",
      status: "available",
      remaining_minutes: null,
      price_yuan: null,
      modes: ["standard"],
    };
    const contextWithPhysicalNumber: CampusContext = {
      all_machines: [washer],
      available_machines: [washer],
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

    const plan = planLaundry([item], {
      selected_item_ids: ["shirt"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
      preferred_machine_floor: null,
    }, contextWithPhysicalNumber);

    const warningText = plan.global_warnings.join("\n");
    expect(warningText).toContain("推荐使用清华大学紫荆16号楼6层6号洗衣机，程序标准洗。");
    expect(warningText).not.toContain("85702265 号洗衣机");
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
    expect(drying.steps[0].warnings.join(" ")).toContain("没有空闲烘干机");
  });
});

// ─── regression tests for hand-wash over-classification bug ─────────────

describe("hand-wash classification (bug fix regressions)", () => {
  const washer: MachineInfo = {
    machine_id: "washer-1",
    location: "Dorm A",
    machine_type: "standard_washer",
    status: "available",
    remaining_minutes: null,
    price_yuan: null,
    modes: ["standard"],
  };
  const context: CampusContext = {
    all_machines: [washer],
    available_machines: [washer],
    queue_estimates: [],
    weather: {},
    drying_context: {},
    pricing_rules: {
      wash_programs: { standard: { price_yuan: 3.5, duration_minutes: 40 } },
      dryer_programs: { low: { price_yuan: 2, duration_minutes: 50 } },
    },
  };

  const standardItem = (itemId: string, name: string, colors: string[]): WardrobeItemForPlan => ({
    profile: {
      item_id: itemId,
      name,
      user_note: "",
      material_ratios: { cotton: 1 },
      colors,
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
  });

  it("keeps do_not_machine_wash items out of machine-wash buckets", () => {
    const jacket: WardrobeItemForPlan = {
      profile: {
        item_id: "silver-jacket",
        name: "银色机能风多口袋外套",
        user_note: "洗涤方式：不可机洗；建议冷水轻柔手洗。",
        material_ratios: { polyester: 1 },
        colors: ["银色"],
        care_warnings: ["do_not_machine_wash"],
        care_recommendations: [],
        care_forbidden: ["do_not_machine_wash"],
        care_symbols: {},
        risks: { deform: "high" },
        recommended_wash: "hand_wash",
      },
      wear_count_since_wash: 1,
      preferred_method: "machine_wash",
      user_notes: ["不可机洗"],
    };

    const plan = planLaundry([jacket], {
      selected_item_ids: ["silver-jacket"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    expect(plan.buckets).toHaveLength(1);
    expect(plan.buckets[0]).toMatchObject({
      bucket_id: "hand-wash",
      wash_method: "hand_wash",
    });
    expect(plan.buckets[0].machine_id).toBeUndefined();
    expect(plan.buckets[0].warnings.join(" ")).toContain("不进入共享洗衣机");
  });

  it("keeps natural-language non-machine-wash notes out of machine-wash buckets", () => {
    const jacket: WardrobeItemForPlan = {
      profile: {
        item_id: "non-machine-jacket",
        name: "银色机能风外套",
        user_note: "这件外套非机洗，建议冷水手洗后自然晾干。",
        material_ratios: { polyester: 1 },
        colors: ["银色"],
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

    const plan = planLaundry([jacket], {
      selected_item_ids: ["non-machine-jacket"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    expect(plan.buckets).toHaveLength(1);
    expect(plan.buckets[0].bucket_id).toBe("hand-wash");
    expect(plan.buckets[0].wash_method).toBe("hand_wash");
  });

  it("keeps structured hand-wash care tags out of machine-wash buckets", () => {
    const jacket: WardrobeItemForPlan = {
      profile: {
        item_id: "hand-wash-care-tag-jacket",
        name: "银色机能风多口袋夹克",
        user_note: "洗涤方式：手洗（推断）；洗涤温度：冷水（推断）；翻转烘干：不可烘干（推断）\n银色 PU 涂层材质较特殊，建议冷水轻柔手洗。",
        material_ratios: { synthetic: 0.5, "pu涂层": 0.5 },
        colors: ["银色", "蓝色", "黑色"],
        care_warnings: [],
        care_recommendations: [],
        care_forbidden: [],
        care_symbols: {},
        risks: { dryer_damage: "high" },
        recommended_wash: "machine_wash",
      },
      wear_count_since_wash: 1,
      preferred_method: "machine_wash",
      user_notes: [],
    };

    const plan = planLaundry([jacket], {
      selected_item_ids: ["hand-wash-care-tag-jacket"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    expect(plan.buckets).toHaveLength(1);
    expect(plan.buckets[0]).toMatchObject({
      bucket_id: "hand-wash",
      wash_method: "hand_wash",
    });
    expect(plan.buckets[0].machine_id).toBeUndefined();
  });

  it("classifies light blue and silver as light-standard instead of defaulting to dark", () => {
    const items: WardrobeItemForPlan[] = [
      standardItem("light-blue-jeans", "浅蓝色牛仔裤", ["浅蓝色"]),
      standardItem("silver-socks", "银色袜子", ["银色"]),
    ];

    const plan = planLaundry(items, {
      selected_item_ids: ["light-blue-jeans", "silver-socks"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: false,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    expect(plan.buckets).toHaveLength(1);
    expect(plan.buckets[0].bucket_id).toBe("light-standard");
    expect(plan.buckets[0].item_ids).toEqual(["light-blue-jeans", "silver-socks"]);
  });

  it("keeps explicit light colors out of dark buckets when notes mention separating from dark clothes", () => {
    const baseWhiteTee = standardItem("white-print-tee", "Dickies白色印花短袖T恤", ["white"]);
    const whiteTee: WardrobeItemForPlan = {
      ...baseWhiteTee,
      profile: {
        ...baseWhiteTee.profile,
        user_note: "建议冷水机洗，避免与深色衣物混洗。",
        care_recommendations: ["深浅色分开洗"],
      },
      user_notes: ["避免与深色衣物混洗"],
    };
    const paleShorts: WardrobeItemForPlan = standardItem("pale-shorts", "浅灰休闲短裤", ["浅灰"]);
    const blackJacket: WardrobeItemForPlan = standardItem("black-jacket", "黑色羽绒服", ["black"]);

    const plan = planLaundry([whiteTee, paleShorts, blackJacket], {
      selected_item_ids: ["white-print-tee", "pale-shorts", "black-jacket"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: false,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    const lightBucket = plan.buckets.find((bucket) => bucket.bucket_id === "light-standard");
    const darkBucket = plan.buckets.find((bucket) => bucket.bucket_id === "dark-standard");
    expect(lightBucket?.item_ids).toEqual(["white-print-tee", "pale-shorts"]);
    expect(darkBucket?.item_ids).toEqual(["black-jacket"]);
  });

  it("keeps pink and light-patterned garments out of the dark bucket in a nine-item outfit plan", () => {
    const silverJacket: WardrobeItemForPlan = {
      ...standardItem("silver-jacket", "银色机能风多口袋外套", ["银色"]),
      profile: {
        ...standardItem("silver-jacket", "银色机能风多口袋外套", ["银色"]).profile,
        care_warnings: ["do_not_machine_wash"],
        care_forbidden: ["do_not_machine_wash"],
        recommended_wash: "hand_wash",
      },
    };
    const items: WardrobeItemForPlan[] = [
      standardItem("white-tee", "Dickies白色印花短袖T恤", ["white"]),
      standardItem("black-white-tee", "CHOCOOLATE黑白拼接短袖上衣", ["black", "white"]),
      standardItem("pink-shorts", "粉色休闲短裤", ["pink"]),
      standardItem("light-blue-pants", "浅蓝色休闲长裤", ["light blue"]),
      standardItem("gray-hoodie", "灰色短袖连帽卫衣", ["gray"]),
      standardItem("pattern-dress", "赴云端连衣裙", ["多色"]),
      standardItem("black-puffer", "黑色羽绒服/棉服", ["black"]),
      silverJacket,
      standardItem("socks", "袜子", ["black", "gray"]),
    ];

    const plan = planLaundry(items, {
      selected_item_ids: items.map((item) => item.profile.item_id),
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: false,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    const bucketsById = new Map(plan.buckets.map((bucket) => [bucket.bucket_id, bucket]));
    expect(bucketsById.get("hand-wash")?.item_ids).toEqual(["silver-jacket"]);
    expect(bucketsById.get("dark-standard")?.item_ids).toEqual(["black-white-tee", "black-puffer", "socks"]);
    expect(bucketsById.get("light-standard")?.item_ids).toEqual([
      "white-tee",
      "pink-shorts",
      "light-blue-pants",
      "gray-hoodie",
      "pattern-dress",
    ]);
  });

  it("does NOT force hand-wash for a hoodie with shrink note and machine_wash preference", () => {
    // Bug: hoodie with "缩水" in notes was forced to hand-wash
    const hoodie: WardrobeItemForPlan = {
      profile: {
        item_id: "hoodie",
        name: "优衣库灰色连帽卫衣",
        user_note: "之前高温烘干后有点缩水，今晚想穿干净的。",
        material_ratios: { "棉混纺": 1 },
        colors: ["深色"],
        care_warnings: [],
        care_recommendations: [],
        care_forbidden: [],
        care_symbols: {},
        risks: { shrink: "medium" },
        recommended_wash: "machine_wash",
      },
      wear_count_since_wash: 0,
      preferred_method: "machine_wash",
      user_notes: ["之前高温烘干后有点缩水"],
    };

    const plan = planLaundry([hoodie], {
      selected_item_ids: ["hoodie"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    expect(plan.buckets).toHaveLength(1);
    expect(plan.buckets[0].wash_method).toBe("machine_wash");
    expect(plan.buckets[0].bucket_id).toBe("dark-standard");
  });

  it("does NOT force hand-wash for an item with high shrink risk but machine_wash preference", () => {
    const riskyItem: WardrobeItemForPlan = {
      profile: {
        item_id: "risky-cotton",
        name: "纯棉衬衫",
        user_note: "",
        material_ratios: { cotton: 1 },
        colors: ["white"],
        care_warnings: ["avoid_hot_water"],
        care_recommendations: [],
        care_forbidden: ["avoid_hot_water"],
        care_symbols: {},
        risks: { shrink: "high" },
        recommended_wash: "machine_wash",
      },
      wear_count_since_wash: 2,
      preferred_method: "machine_wash",
      user_notes: [],
    };

    const plan = planLaundry([riskyItem], {
      selected_item_ids: ["risky-cotton"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    expect(plan.buckets[0].wash_method).toBe("machine_wash");
    // Should have shrink risk warning
    const warningText = plan.buckets[0].warnings.join(" ");
    expect(warningText).toContain("缩水风险");
    // Should use laundry bag as precaution
    expect(plan.buckets[0].use_laundry_bag).toBe(true);
  });

  it("still forces hand-wash for wool items", () => {
    const woolSweater: WardrobeItemForPlan = {
      profile: {
        item_id: "wool",
        name: "羊毛衫",
        user_note: "",
        material_ratios: { wool: 0.9, nylon: 0.1 },
        colors: ["gray"],
        care_warnings: ["hand_wash_only"],
        care_recommendations: [],
        care_forbidden: ["hand_wash_only"],
        care_symbols: {},
        risks: { shrink: "high", deform: "high" },
        recommended_wash: "hand_wash",
      },
      wear_count_since_wash: 3,
      preferred_method: "hand_wash",
      user_notes: [],
    };

    const plan = planLaundry([woolSweater], {
      selected_item_ids: ["wool"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    expect(plan.buckets[0].wash_method).toBe("hand_wash");
    expect(plan.buckets[0].bucket_id).toBe("hand-wash");
  });

  it("still forces hand-wash when care label explicitly says 只能手洗", () => {
    const item: WardrobeItemForPlan = {
      profile: {
        item_id: "delicate",
        name: "丝绸衬衫",
        user_note: "只能手洗",
        material_ratios: { silk: 1 },
        colors: ["white"],
        care_warnings: ["hand_wash_only"],
        care_recommendations: [],
        care_forbidden: ["hand_wash_only"],
        care_symbols: {},
        risks: {},
        recommended_wash: "hand_wash",
      },
      wear_count_since_wash: 1,
      preferred_method: "hand_wash",
      user_notes: [],
    };

    const plan = planLaundry([item], {
      selected_item_ids: ["delicate"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    expect(plan.buckets[0].wash_method).toBe("hand_wash");
  });

  it("does NOT force hand-wash from bare 手洗 in unrelated context", () => {
    // User wrote "也可以手洗" meaning "can also hand wash" — not "only hand wash"
    const item: WardrobeItemForPlan = {
      profile: {
        item_id: "casual-tee",
        name: "休闲 T 恤",
        user_note: "也可以手洗，但一般直接机洗",
        material_ratios: { cotton: 1 },
        colors: ["black"],
        care_warnings: [],
        care_recommendations: [],
        care_forbidden: [],
        care_symbols: {},
        risks: {},
        recommended_wash: "machine_wash",
      },
      wear_count_since_wash: 2,
      preferred_method: "machine_wash",
      user_notes: ["也可以手洗，但一般直接机洗"],
    };

    const plan = planLaundry([item], {
      selected_item_ids: ["casual-tee"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    expect(plan.buckets[0].wash_method).toBe("machine_wash");
  });

  it("defaults unknown-color items to dark-standard for safety", () => {
    const item: WardrobeItemForPlan = {
      profile: {
        item_id: "mystery",
        name: "某件衣服",
        user_note: "",
        material_ratios: { polyester: 1 },
        colors: [],
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

    const plan = planLaundry([item], {
      selected_item_ids: ["mystery"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    expect(plan.buckets[0].bucket_id).toBe("dark-standard");
  });
});

// ─── mixed-standard bucket support ──────────────────────────────────────

describe("mixed-standard bucket (allow_mixed_colors)", () => {
  const washer: MachineInfo = {
    machine_id: "washer-1",
    location: "Dorm A",
    machine_type: "standard_washer",
    status: "available",
    remaining_minutes: null,
    price_yuan: null,
    modes: ["standard"],
  };
  const context: CampusContext = {
    all_machines: [washer],
    available_machines: [washer],
    queue_estimates: [],
    weather: {},
    drying_context: {},
    pricing_rules: {
      wash_programs: { standard: { price_yuan: 3.5, duration_minutes: 40 } },
      dryer_programs: { low: { price_yuan: 2, duration_minutes: 50 } },
    },
  };

  it("combines light and dark items into mixed-standard when allow_mixed_colors is true", () => {
    const items: WardrobeItemForPlan[] = [
      {
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
      },
      {
        profile: {
          item_id: "navy-tee",
          name: "藏青色 T 恤",
          user_note: "",
          material_ratios: { cotton: 1 },
          colors: ["navy"],
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
      },
    ];

    const plan = planLaundry(items, {
      selected_item_ids: ["white-tee", "navy-tee"],
      urgent_item_ids: [],
      allow_mixed_colors: true,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    expect(plan.buckets).toHaveLength(1);
    expect(plan.buckets[0].bucket_id).toBe("mixed-standard");
    expect(plan.buckets[0].item_ids).toEqual(["white-tee", "navy-tee"]);
    // Should have detergent calculation for mixed-standard
    expect(plan.buckets[0].detergent_ml).toBe(30.0);
    // Should have the mixed-standard warning
    expect(plan.buckets[0].warnings.join(" ")).toContain("允许混色");
  });

  it("keeps dark and light separate when allow_mixed_colors is false", () => {
    const items: WardrobeItemForPlan[] = [
      {
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
      },
      {
        profile: {
          item_id: "black-tee",
          name: "黑色 T 恤",
          user_note: "",
          material_ratios: { cotton: 1 },
          colors: ["black"],
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
      },
    ];

    const plan = planLaundry(items, {
      selected_item_ids: ["white-tee", "black-tee"],
      urgent_item_ids: [],
      allow_mixed_colors: false,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    expect(plan.buckets).toHaveLength(2);
    expect(plan.buckets.map((b) => b.bucket_id)).toContain("light-standard");
    expect(plan.buckets.map((b) => b.bucket_id)).toContain("dark-standard");
  });

  it("does NOT mix items with high color_bleed risk even when allow_mixed_colors is true", () => {
    const items: WardrobeItemForPlan[] = [
      {
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
      },
      {
        profile: {
          item_id: "jeans",
          name: "黑色牛仔裤",
          user_note: "",
          material_ratios: { denim: 1 },
          colors: ["black"],
          care_warnings: [],
          care_recommendations: [],
          care_forbidden: [],
          care_symbols: {},
          risks: { color_bleed: "high" },
          recommended_wash: "machine_wash",
        },
        wear_count_since_wash: 3,
        preferred_method: "machine_wash",
        user_notes: [],
      },
    ];

    const plan = planLaundry(items, {
      selected_item_ids: ["white-tee", "jeans"],
      urgent_item_ids: [],
      allow_mixed_colors: true,
      allow_dryer: false,
      hygiene_sensitive: true,
      max_wait_minutes: null,
      budget_yuan: null,
    }, context);

    // Jeans have high color_bleed → stays in dark-standard even with allow_mixed_colors
    expect(plan.buckets).toHaveLength(2);
    const jeansBucket = plan.buckets.find((b) => b.item_ids.includes("jeans"));
    expect(jeansBucket?.bucket_id).toBe("dark-standard");
  });
});
