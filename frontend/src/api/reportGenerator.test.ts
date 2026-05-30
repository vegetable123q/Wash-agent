import { describe, expect, it } from "vitest";
import { generateReport } from "./reportGenerator";
import type { CampusContext, LaundryPlan, WardrobeItemForPlan } from "./types";

describe("generateReport", () => {
  it("renders user-facing labels instead of internal bucket and program ids", () => {
    const plan: LaundryPlan = {
      buckets: [
        {
          bucket_id: "large-bedding",
          item_ids: ["bedding"],
          wash_method: "machine_wash",
          machine_type: "standard_washer",
          program: "standard",
          detergent_ml: 35,
          use_laundry_bag: false,
          dry_method: "air_dry",
          warnings: ["推荐使用 455514，位置 南区21号楼 一层，程序 standard。"],
        },
      ],
      estimated_cost_yuan: 4,
      estimated_duration_minutes: 40,
      summary: "床品单独清洗。",
      global_warnings: ["standard_washer 等待时间未知，无法确认是否满足最大等待 10 分钟。"],
    };
    const items: WardrobeItemForPlan[] = [
      {
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
        user_notes: [],
      },
    ];
    const campusContext: CampusContext = {
      all_machines: [
        {
          machine_id: "455514",
          location: "南区21号楼 一层",
          machine_type: "standard_washer",
          status: "available",
          remaining_minutes: null,
          price_yuan: null,
          modes: ["standard"],
        },
      ],
      available_machines: [
        {
          machine_id: "455514",
          location: "南区21号楼 一层",
          machine_type: "standard_washer",
          status: "available",
          remaining_minutes: null,
          price_yuan: null,
          modes: ["standard"],
        },
      ],
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
        wash_programs: { standard: { price_yuan: 4, duration_minutes: 40 } },
        dryer_programs: {},
      },
    };

    const report = generateReport(plan, items, campusContext);
    const text = JSON.stringify(report);

    expect(report.sections["洗衣步骤"]).toContain("床品单独洗：床单被套");
    expect(report.sections["洗衣步骤"]).toContain("程序：标准洗");
    expect(report.sections["费用和时间"]).toContain("床品单独洗 · 标准洗");
    expect(report.risk_notes).toContain("洗衣机 等待时间未知，无法确认是否满足最大等待 10 分钟。");
    expect(text).toContain("洗衣机 等待时间未知");
    expect(text).not.toMatch(/large-bedding|standard_washer|程序 standard/);
  });

  it("rejects duplicate plan item ids before rendering", () => {
    const plan = minimalPlan();
    plan.buckets = [
      { ...plan.buckets[0], bucket_id: "first", item_ids: ["bedding"] },
      { ...plan.buckets[0], bucket_id: "second", item_ids: ["bedding"] },
    ];

    expect(() => generateReport(plan, minimalItems(), minimalCampusContext())).toThrow(/duplicate.*bedding/);
  });

  it("rejects duplicate report item ids before rendering", () => {
    const baseItem = minimalItems()[0];
    const items = [
      baseItem,
      { ...baseItem, profile: { ...baseItem.profile, name: "duplicate bedding" } },
    ];

    expect(() => generateReport(minimalPlan(), items, minimalCampusContext())).toThrow(/duplicate.*bedding/);
  });
});

function minimalPlan(): LaundryPlan {
  return {
    buckets: [
      {
        bucket_id: "large-bedding",
        item_ids: ["bedding"],
        wash_method: "machine_wash",
        machine_type: "standard_washer",
        program: "standard",
        detergent_ml: 35,
        use_laundry_bag: false,
        dry_method: "air_dry",
        warnings: [],
      },
    ],
    estimated_cost_yuan: 4,
    estimated_duration_minutes: 40,
    summary: "",
    global_warnings: [],
  };
}

function minimalItems(): WardrobeItemForPlan[] {
  return [
    {
      profile: {
        item_id: "bedding",
        name: "搴婂崟琚",
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
  ];
}

function minimalCampusContext(): CampusContext {
  return {
    all_machines: [],
    available_machines: [],
    queue_estimates: [],
    weather: {},
    drying_context: {},
    pricing_rules: {
      wash_programs: {},
      dryer_programs: {},
    },
  };
}
