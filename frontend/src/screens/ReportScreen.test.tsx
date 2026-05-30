import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { MobileSummary } from "../api/mobileSummary";
import { ReportScreen } from "./ReportScreen";

describe("ReportScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows a visual report structure without technical labels", () => {
    render(<ReportScreen />);

    expect(screen.getByRole("heading", { name: "本次结论" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "环境速览" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "洗护路线" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "重点提醒" })).toBeInTheDocument();
    expect(screen.queryByText(/后端|WashReport|LaundryPlan/)).not.toBeInTheDocument();
  });

  it("uses friendly bucket and program names in the price breakdown", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: ["bedding"],
      dirty_basket: {
        item_count: 1,
        load_percent: 40,
        oldest_days: 1,
        urgent_count: 0,
        status_label: "可清洗",
        recommendation: "床品可以本次清洗。",
        next_action: "查看方案",
        items: [],
      },
      wardrobe: { items: [] },
      campus_context: {
        all_machines: [],
        available_machines: [],
        queue_estimates: [],
        weather: {},
        drying_context: {},
        pricing_rules: {
          wash_programs: { standard: { price_yuan: 4, duration_minutes: 40 } },
          dryer_programs: { low: { price_yuan: 2, duration_minutes: 50 } },
        },
      },
      plan: {
        buckets: [
          {
            bucket_id: "large-bedding",
            item_ids: ["bedding"],
            wash_method: "machine_wash",
            machine_type: "standard_washer",
            program: "standard",
            detergent_ml: 30,
            use_laundry_bag: false,
            dry_method: "air_dry",
            warnings: [],
          },
        ],
        estimated_cost_yuan: 4,
        estimated_duration_minutes: 40,
        summary: "床品单独洗。",
        global_warnings: [],
      },
      report: {
        title: "本次校园洗衣报告",
        sections: {
          洗衣步骤: "床品单独洗：床单被套。",
          费用和时间: "预计费用 4 元。",
        },
        savings_notes: ["自然晾干减少烘干用电。"],
        risk_notes: ["床品单独成桶。"],
      },
    } satisfies MobileSummary;

    const { container } = render(<ReportScreen mobileSummary={mobileSummary} />);

    expect(screen.getByText("床品单独洗")).toBeInTheDocument();
    expect(screen.getByText("机洗 · 标准洗")).toBeInTheDocument();
    expect(container.textContent).not.toMatch(/后端|WashReport|large-bedding|standard_washer/);
  });

  it("renders concise visual cards instead of raw long report paragraphs", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: ["jeans", "coat", "scarf", "cashmere"],
      dirty_basket: {
        item_count: 4,
        load_percent: 90,
        oldest_days: 2,
        urgent_count: 1,
        status_label: "需要清洗",
        recommendation: "今晚处理。",
        next_action: "查看报告",
        items: [],
      },
      wardrobe: {
        items: [
          wardrobeItem("jeans", "黑色牛仔裤"),
          wardrobeItem("coat", "黑色假两件短袖上衣"),
          wardrobeItem("scarf", "银色机能风夹克"),
          wardrobeItem("cashmere", "赴云端连衣裙"),
        ],
      },
      campus_context: {
        all_machines: Array.from({ length: 13 }, (_, index) => ({
          machine_id: `m-${index}`,
          location: "南区22号楼",
          machine_type: "standard_washer",
          status: index < 9 ? "available" : "running",
          remaining_minutes: index < 9 ? null : 20,
          price_yuan: null,
          modes: ["standard"],
        })),
        available_machines: Array.from({ length: 9 }, (_, index) => ({
          machine_id: `m-${index}`,
          location: "南区22号楼",
          machine_type: "standard_washer",
          status: "available",
          remaining_minutes: null,
          price_yuan: null,
          modes: ["standard"],
        })),
        queue_estimates: [
          {
            machine_type: "standard_washer",
            total_count: 13,
            available_count: 9,
            running_count: 4,
            out_of_service_count: 0,
            unknown_count: 0,
            estimated_wait_minutes: 0,
          },
        ],
        weather: {},
        drying_context: { balcony_available: true, ventilation: "normal" },
        pricing_rules: {
          wash_programs: { standard: { price_yuan: 4, duration_minutes: 40 } },
          dryer_programs: { low: { price_yuan: 3, duration_minutes: 50 } },
        },
      },
      plan: {
        buckets: [
          {
            bucket_id: "dark-standard",
            item_ids: ["jeans", "coat", "scarf"],
            wash_method: "machine_wash",
            machine_type: "standard_washer",
            program: "standard",
            detergent_ml: 36,
            use_laundry_bag: true,
            dry_method: "air_dry",
            warnings: ["推荐使用 790781，位置 南区22号楼 一层，程序 standard。"],
          },
          {
            bucket_id: "dry-clean",
            item_ids: ["cashmere"],
            wash_method: "dry_clean",
            machine_type: "unknown",
            program: "",
            detergent_ml: null,
            use_laundry_bag: false,
            dry_method: "do_not_dry",
            warnings: ["该批次建议送专业干洗，不进入共享洗衣机。"],
          },
        ],
        estimated_cost_yuan: 11,
        estimated_duration_minutes: 180,
        summary: "本次按颜色和材质分开处理。",
        global_warnings: [],
      },
      drying_plan: {
        steps: [
          {
            bucket_id: "dark-standard",
            item_ids: ["jeans", "coat", "scarf"],
            dry_method: "low_heat_dryer",
            dryer_machine_id: "dryer-1",
            dryer_machine_location: "南区22号楼 一层",
            estimated_cost_yuan: 3,
            estimated_duration_minutes: 50,
            warnings: [],
          },
          {
            bucket_id: "dry-clean",
            item_ids: ["cashmere"],
            dry_method: "do_not_dry",
            warnings: [],
          },
        ],
        estimated_cost_yuan: 3,
        estimated_duration_minutes: 50,
        cost_breakdown: [{ bucket_id: "dark-standard", label: "dark-standard 低温烘干", amount_yuan: 3, duration_minutes: 50, machine_id: "dryer-1", machine_type: "dryer", program: "low" }],
        warnings: [],
      },
      report: {
        title: "本次洗护报告",
        sections: {
          洗衣步骤: "1. 干洗衣物：赴云端连衣裙；原因：该批次需要专业干洗；洗护方式：干洗；干燥：不烘干；提醒：该批次建议送专业干洗，不进入共享洗衣机。\n2. 深色标准洗：黑色假两件短袖上衣、短袖连帽卫衣、黑色棉服、银色机能风夹克；原因：材质或风险提示不适合共享洗衣机；洗护方式：手洗；洗衣液：32 ml；使用洗衣袋；干燥：自然晾干。",
          费用和时间: "预计费用 11 元，预计机器占用时间 180 分钟。计费批次：深色标准洗；标准；浅色标准洗；标准。",
        },
        savings_notes: ["自然晾干批次减少烘干用电，也能降低缩水和变形风险。"],
        risk_notes: ["该批次建议送专业干洗，不进入共享洗衣机。", "深色或掉色风险衣物不要与浅色衣物混洗。"],
      },
    } satisfies MobileSummary;

    const { container } = render(<ReportScreen mobileSummary={mobileSummary} />);

    expect(screen.getByText(/\¥11/)).toBeInTheDocument();
    expect(screen.getByText("180 分钟")).toBeInTheDocument();
    expect(screen.getByText("2 个批次")).toBeInTheDocument();
    expect(screen.getByText("可用 9/13")).toBeInTheDocument();
    expect(screen.getByText("深色标准洗")).toBeInTheDocument();
    expect(screen.getByText("3 件衣物")).toBeInTheDocument();
    expect(screen.getByText("机洗 · 标准洗")).toBeInTheDocument();
    expect(screen.getByText("洗衣液 36 ml")).toBeInTheDocument();
    // Drying is now in a separate "烘干安排" section.
    expect(screen.getByText("低温烘干")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "烘干安排" })).toBeInTheDocument();
    expect(container.textContent).not.toContain("1. 干洗衣物");
    expect(container.textContent).not.toContain("计费批次");
    expect(container.textContent).not.toContain("790781");
  });

  it("does not show the static demo total when a live summary has no cost yet", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: [],
      dirty_basket: {
        item_count: 0,
        load_percent: 0,
        oldest_days: 0,
        urgent_count: 0,
        status_label: "空篮",
        recommendation: "请选择本次衣物。",
        next_action: "去选择",
        items: [],
      },
      wardrobe: { items: [] },
      campus_context: {
        all_machines: [],
        available_machines: [],
        queue_estimates: [],
        weather: {},
        drying_context: {},
        pricing_rules: { wash_programs: {}, dryer_programs: {} },
      },
      plan: {
        buckets: [],
        estimated_cost_yuan: null,
        estimated_duration_minutes: null,
        summary: "请选择本次要清洗的衣物后生成洗护安排。",
        global_warnings: [],
      },
      report: {
        title: "本次洗护报告",
        sections: {
          洗衣步骤: "请选择本次要清洗的衣物后生成洗护安排。",
        },
        savings_notes: [],
        risk_notes: [],
      },
    } satisfies MobileSummary;

    const { container } = render(<ReportScreen mobileSummary={mobileSummary} />);

    expect(screen.getAllByText("待确认").length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain("¥24");
  });

  it("hides invalid live report numbers", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: ["tee-1"],
      dirty_basket: {
        item_count: 1,
        load_percent: 20,
        oldest_days: 1,
        urgent_count: 0,
        status_label: "可清洗",
        recommendation: "今晚处理。",
        next_action: "查看报告",
        items: [],
      },
      wardrobe: { items: [wardrobeItem("tee-1", "白色棉 T 恤")] },
      campus_context: {
        all_machines: [
          {
            machine_id: "washer-1",
            location: "南区21号楼",
            machine_type: "standard_washer",
            status: "running",
            remaining_minutes: null,
            price_yuan: null,
            modes: ["standard"],
          },
        ],
        available_machines: [],
        queue_estimates: [
          {
            machine_type: "standard_washer",
            total_count: 1,
            available_count: 0,
            running_count: 1,
            out_of_service_count: 0,
            unknown_count: 0,
            estimated_wait_minutes: 1.25,
          },
        ],
        weather: {},
        drying_context: {},
        pricing_rules: {
          wash_programs: { standard: { price_yuan: Number.POSITIVE_INFINITY } },
          dryer_programs: {},
        },
      },
      plan: {
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
        summary: "浅色衣物标准洗。",
        global_warnings: [],
      },
      report: {
        title: "本次洗护报告",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } satisfies MobileSummary;

    const { container } = render(<ReportScreen mobileSummary={mobileSummary} />);

    expect(container.textContent).not.toMatch(/NaN|Infinity/);
    expect(container.textContent).not.toContain("1.5");
    expect(container.textContent).not.toContain("1.25");
    expect(screen.getAllByText("待确认").length).toBeGreaterThan(0);
    expect(screen.getByText("费用待确认")).toBeInTheDocument();
  });

  it("uses plan global warnings when report risk notes are empty", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: ["tee-1"],
      dirty_basket: {
        item_count: 1,
        load_percent: 30,
        oldest_days: 1,
        urgent_count: 0,
        status_label: "可清洗",
        recommendation: "今晚处理。",
        next_action: "查看报告",
        items: [],
      },
      wardrobe: { items: [wardrobeItem("tee-1", "白色棉 T 恤")] },
      campus_context: {
        all_machines: [],
        available_machines: [],
        queue_estimates: [],
        weather: {},
        drying_context: {},
        pricing_rules: { wash_programs: { standard: { price_yuan: 3.5, duration_minutes: 40 } }, dryer_programs: {} },
      },
      plan: {
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
        estimated_cost_yuan: 3.5,
        estimated_duration_minutes: 40,
        summary: "浅色衣物标准洗。",
        global_warnings: ["预计费用 3.5 元超过预算 3 元。"],
      },
      report: {
        title: "本次洗护报告",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } satisfies MobileSummary;

    render(<ReportScreen mobileSummary={mobileSummary} />);

    expect(screen.getByText("预计费用 3.5 元超过预算 3 元。")).toBeInTheDocument();
  });

  it("uses friendly labels for plan global warning reminders", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: ["tee-1"],
      dirty_basket: {
        item_count: 1,
        load_percent: 30,
        oldest_days: 1,
        urgent_count: 0,
        status_label: "可清洗",
        recommendation: "今晚处理。",
        next_action: "查看报告",
        items: [],
      },
      wardrobe: { items: [wardrobeItem("tee-1", "白色棉 T 恤")] },
      campus_context: {
        all_machines: [],
        available_machines: [],
        queue_estimates: [],
        weather: {},
        drying_context: {},
        pricing_rules: { wash_programs: { standard: { price_yuan: 3.5, duration_minutes: 40 } }, dryer_programs: {} },
      },
      plan: {
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
        estimated_cost_yuan: 3.5,
        estimated_duration_minutes: 40,
        summary: "浅色衣物标准洗。",
        global_warnings: ["standard_washer 等待时间未知，无法确认是否满足最大等待 10 分钟。"],
      },
      report: {
        title: "本次洗护报告",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } satisfies MobileSummary;

    const { container } = render(<ReportScreen mobileSummary={mobileSummary} />);

    expect(screen.getByText("洗衣机 等待时间未知，无法确认是否满足最大等待 10 分钟。")).toBeInTheDocument();
    expect(container.textContent).not.toContain("standard_washer");
  });
});

function wardrobeItem(itemId: string, name: string): MobileSummary["wardrobe"]["items"][number] {
  return {
    item_id: itemId,
    name,
    user_note: "",
    user_notes: [],
    wear_count_since_wash: 1,
    wash_count: 0,
    material_ratios: {},
    colors: [],
    risks: {},
  };
}
