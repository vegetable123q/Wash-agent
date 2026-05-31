import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MobileSummary } from "../api/mobileSummary";
import { ReportScreen } from "./ReportScreen";

describe("ReportScreen", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows a visual report structure without technical labels", () => {
    const { container } = render(<ReportScreen />);

    expect(screen.getByRole("heading", { name: "本次结论" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "环境速览" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "洗护路线" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "重点提醒" })).toBeInTheDocument();
    expect(screen.getAllByText("待确认").length).toBeGreaterThan(0);
    expect(screen.queryByText("用几眼看完花费、路线和风险，不再读长段报告。")).not.toBeInTheDocument();
    expect(screen.queryByText(/后端|WashReport|LaundryPlan/)).not.toBeInTheDocument();
    expect(container.textContent).not.toContain("¥24");
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
            machine_id: "clever-nq21-6",
            machine_location: "南区21号楼 六层",
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
    expect(screen.getByText("230 分钟")).toBeInTheDocument();
    expect(screen.getByText("洗 180 分 + 烘 50 分")).toBeInTheDocument();
    expect(screen.getByText("全程用时")).toBeInTheDocument();
    expect(screen.getByText("2 个批次")).toBeInTheDocument();
    expect(screen.getByText("可用 9/13")).toBeInTheDocument();
    expect(screen.getByText("深色标准洗")).toBeInTheDocument();
    expect(screen.getByText("3 件衣物")).toBeInTheDocument();
    expect(screen.getByText("机洗 · 标准洗")).toBeInTheDocument();
    expect(screen.getByText("南区21号楼六层6号洗衣机")).toBeInTheDocument();
    expect(screen.getByText("洗衣液 36 ml")).toBeInTheDocument();
    // Drying is now in a separate "烘干安排" section.
    expect(screen.getByText("低温烘干")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "烘干安排" })).toBeInTheDocument();
    expect(container.textContent).not.toContain("1. 干洗衣物");
    expect(container.textContent).not.toContain("计费批次");
    expect(container.textContent).not.toContain("790781");
    expect(container.textContent).not.toContain("clever-nq21-6");
  });

  it("shows a one-line now-do-this version for an active plan", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date(2026, 4, 31, 19, 15));
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: ["hoodie-1", "jeans-1", "tee-1"],
      dirty_basket: {
        item_count: 3,
        load_percent: 70,
        oldest_days: 1,
        urgent_count: 0,
        status_label: "可清洗",
        recommendation: "今晚处理。",
        next_action: "查看报告",
        items: [],
      },
      wardrobe: {
        items: [
          wardrobeItem("hoodie-1", "黑色卫衣"),
          wardrobeItem("jeans-1", "牛仔裤"),
          wardrobeItem("tee-1", "白T"),
        ],
      },
      campus_context: {
        all_machines: [],
        available_machines: [],
        queue_estimates: [],
        weather: {},
        drying_context: {},
        pricing_rules: { wash_programs: {}, dryer_programs: {} },
      },
      plan: {
        buckets: [
          {
            bucket_id: "dark-standard",
            item_ids: ["hoodie-1", "jeans-1", "tee-1"],
            wash_method: "machine_wash",
            machine_type: "standard_washer",
            machine_id: "washer-6-3",
            machine_location: "6层洗衣机",
            program: "standard",
            detergent_ml: 36,
            use_laundry_bag: true,
            dry_method: "air_dry",
            estimated_cost_yuan: 11,
            estimated_duration_minutes: 180,
            warnings: [],
          },
        ],
        estimated_cost_yuan: 11,
        estimated_duration_minutes: 180,
        summary: "带这三件衣物去洗。",
        global_warnings: [],
      },
      report: {
        title: "本次洗护报告",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } satisfies MobileSummary;

    render(<ReportScreen mobileSummary={mobileSummary} />);

    expect(screen.getByText("带：黑色卫衣、牛仔裤、白T；去：6层洗衣机；花：约 ¥11；19:15 开始，22:15 前结束。")).toBeInTheDocument();
  });

  it("keeps a weekly completed report when the current dirty basket is empty", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: [],
      dirty_basket: {
        item_count: 0,
        load_percent: 0,
        oldest_days: 0,
        urgent_count: 0,
        status_label: "空篮",
        recommendation: "先选择衣物。",
        next_action: "去选择",
        items: [],
      },
      wardrobe: { items: [wardrobeItem("tee-1", "白色棉 T 恤")] },
      campus_context: {
        all_machines: [],
        available_machines: [],
        queue_estimates: [],
        weather: {},
        drying_context: {},
        pricing_rules: { wash_programs: {}, dryer_programs: {} },
      },
      completed_laundry: {
        weekly_count: 1,
        weekly_cost_yuan: 11,
        recent_records: [
          {
            record_id: "complete-1",
            completed_at: "2026-05-31T19:15:00.000Z",
            completed_item_ids: ["tee-1"],
            item_names: ["白色棉 T 恤"],
            estimated_cost_yuan: 11,
            estimated_duration_minutes: 180,
            machine_labels: ["6层洗衣机"],
            plan_summary: "已完成。",
            before_items: [{ item_id: "tee-1", wear_count_since_wash: 5, wash_count: 1 }],
          },
        ],
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
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } satisfies MobileSummary;

    render(<ReportScreen mobileSummary={mobileSummary} />);

    expect(screen.getByText("本周已洗 1 次")).toBeInTheDocument();
    expect(screen.getByText("本周花费 ¥11")).toBeInTheDocument();
    expect(screen.getByText("最近一次：白色棉 T 恤")).toBeInTheDocument();
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

  it("shows campus setup status instead of claiming no wait when machines are not configured", () => {
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
      campus_status: {
        state: "unconfigured",
        dorm_name: "",
        message: "请先在“我的”选择宿舍楼。",
        updated_at: "2026-05-30T00:00:00.000Z",
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
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } satisfies MobileSummary;

    const { container } = render(<ReportScreen mobileSummary={mobileSummary} />);

    expect(screen.getAllByText("待配置").length).toBeGreaterThan(0);
    expect(screen.getByText("请先在我的页面选择宿舍楼，系统读取机器状态后再生成路线。")).toBeInTheDocument();
    expect(container.textContent).not.toContain("无需等待");
  });

  it("marks retained buckets without assigned washers as blocked instead of executable", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: ["tee-1"],
      dirty_basket: {
        item_count: 1,
        load_percent: 20,
        oldest_days: 0,
        urgent_count: 0,
        status_label: "可清洗",
        recommendation: "等待机器。",
        next_action: "查看报告",
        items: [],
      },
      campus_status: {
        state: "live",
        dorm_name: "紫荆1号楼",
        message: "已读取 1 台实时机器记录。",
        updated_at: "2026-05-30T00:00:00.000Z",
      },
      wardrobe: { items: [wardrobeItem("tee-1", "白色棉 T 恤")] },
      campus_context: {
        all_machines: [
          {
            machine_id: "washer-1",
            location: "紫荆1号楼",
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
            estimated_wait_minutes: null,
          },
        ],
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
            estimated_cost_yuan: null,
            estimated_duration_minutes: null,
            warnings: ["没有空闲洗衣机"],
          },
        ],
        estimated_cost_yuan: null,
        estimated_duration_minutes: null,
        summary: "已保留分桶，等待机器空闲。",
        global_warnings: [],
      },
      report: {
        title: "本次校园洗衣报告",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } satisfies MobileSummary;

    const { container } = render(<ReportScreen mobileSummary={mobileSummary} />);

    expect(screen.getAllByText("待机器空闲").length).toBeGreaterThan(0);
    expect(screen.getByText("费用待确认")).toBeInTheDocument();
    expect(container.textContent).not.toContain("可执行");
    expect(container.textContent).not.toContain("无需机洗计费");
  });

  it("uses bucket cost on route cards instead of recalculating from pricing rules", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: ["tee-1"],
      dirty_basket: {
        item_count: 1,
        load_percent: 20,
        oldest_days: 0,
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
        pricing_rules: { wash_programs: { standard: { price_yuan: 99, duration_minutes: 40 } }, dryer_programs: {} },
      },
      plan: {
        buckets: [
          {
            bucket_id: "light-standard",
            item_ids: ["tee-1"],
            wash_method: "machine_wash",
            machine_type: "standard_washer",
            machine_id: "washer-1",
            machine_location: "紫荆1号楼",
            program: "standard",
            detergent_ml: 24,
            use_laundry_bag: false,
            dry_method: "air_dry",
            estimated_cost_yuan: 3.5,
            estimated_duration_minutes: 40,
            warnings: [],
          },
        ],
        estimated_cost_yuan: 3.5,
        estimated_duration_minutes: 40,
        summary: "浅色标准洗。",
        global_warnings: [],
      },
      report: {
        title: "本次校园洗衣报告",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } satisfies MobileSummary;

    const { container } = render(<ReportScreen mobileSummary={mobileSummary} />);

    expect(screen.getAllByText("¥3.5").length).toBeGreaterThan(0);
    expect(container.textContent).not.toContain("¥99");
    expect(screen.getByText("费用按校园机器规则配置估算，实际以设备页面为准。")).toBeInTheDocument();
  });

  it("splits total cost and cost breakdown into readable text", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: ["tee-1"],
      dirty_basket: {
        item_count: 1,
        load_percent: 20,
        oldest_days: 0,
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
        summary: "浅色标准洗。",
        global_warnings: [],
      },
      drying_plan: {
        steps: [
          {
            bucket_id: "light-standard",
            item_ids: ["tee-1"],
            dry_method: "low_heat_dryer",
            dryer_machine_id: "dryer-1",
            dryer_machine_location: "紫荆1号楼 六层",
            estimated_cost_yuan: 2,
            estimated_duration_minutes: 50,
            warnings: [],
          },
        ],
        estimated_cost_yuan: 2,
        estimated_duration_minutes: 50,
        cost_breakdown: [],
        warnings: [],
      },
      report: {
        title: "本次校园洗衣报告",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } satisfies MobileSummary;

    const { container } = render(<ReportScreen mobileSummary={mobileSummary} />);

    expect(screen.getByText("¥5.5")).toBeInTheDocument();
    expect(screen.getByText("洗 ¥3.5 + 烘 ¥2")).toBeInTheDocument();
    expect(container.textContent).not.toContain("¥5.5（洗 ¥3.5 + 烘 ¥2）");
  });

  it("combines wash and drying durations and avoids duplicated dryer labels", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: ["tee-1"],
      dirty_basket: {
        item_count: 1,
        load_percent: 20,
        oldest_days: 0,
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
        summary: "浅色标准洗。",
        global_warnings: [],
      },
      drying_plan: {
        steps: [
          {
            bucket_id: "light-standard",
            item_ids: ["tee-1"],
            dry_method: "low_heat_dryer",
            dryer_machine_id: "dryer-6",
            dryer_machine_location: "紫荆1号楼 紫荆1号楼6层烘干机",
            estimated_cost_yuan: 2,
            estimated_duration_minutes: 50,
            warnings: [],
          },
        ],
        estimated_cost_yuan: 2,
        estimated_duration_minutes: 50,
        cost_breakdown: [],
        warnings: [],
      },
      report: {
        title: "本次校园洗衣报告",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } satisfies MobileSummary;

    const { container } = render(<ReportScreen mobileSummary={mobileSummary} />);

    expect(screen.getByText("90 分钟")).toBeInTheDocument();
    expect(screen.getByText("洗 40 分 + 烘 50 分")).toBeInTheDocument();
    expect(screen.getByText("全程用时")).toBeInTheDocument();
    expect(container.textContent).not.toContain("烘干机烘干机");
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
