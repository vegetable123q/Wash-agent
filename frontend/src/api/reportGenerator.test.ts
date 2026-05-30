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
          machine_id: "clever-nq21-6",
          machine_location: "南区21号楼 六层",
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
    expect(report.sections["洗衣步骤"]).toContain("洗衣机：南区21号楼六层6号洗衣机");
    expect(report.sections["洗衣步骤"]).toContain("程序：标准洗");
    expect(report.sections["费用和时间"]).toContain("床品单独洗 · 标准洗");
    expect(text).toContain("洗衣机 等待时间未知");
    expect(text).not.toContain("clever-nq21-6");
    expect(text).not.toContain("推荐使用 455514");
    expect(text).not.toMatch(/large-bedding|standard_washer|程序 standard/);
  });

  it("renders an explicit unknown cost section when machines are not fully assigned", () => {
    const plan: LaundryPlan = {
      buckets: [
        {
          bucket_id: "light-standard",
          item_ids: ["tee-1"],
          wash_method: "machine_wash",
          machine_type: "standard_washer",
          program: "standard",
          detergent_ml: 25,
          use_laundry_bag: false,
          dry_method: "air_dry",
          warnings: ["没有空闲洗衣机"],
        },
      ],
      estimated_cost_yuan: null,
      estimated_duration_minutes: null,
      summary: "机器不足时仍保留分桶。",
      global_warnings: [],
    };
    const items: WardrobeItemForPlan[] = [
      {
        profile: {
          item_id: "tee-1",
          name: "白色棉 T 恤",
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
      all_machines: [],
      available_machines: [],
      queue_estimates: [],
      weather: {},
      drying_context: {},
      pricing_rules: {
        wash_programs: { standard: { price_yuan: 3.5, duration_minutes: 40 } },
        dryer_programs: {},
      },
    };

    const report = generateReport(plan, items, campusContext);

    expect(report.sections["费用和时间"]).toContain("暂时无法估算");
    expect(report.sections["风险提醒"]).toContain("没有空闲洗衣机");
  });
});
