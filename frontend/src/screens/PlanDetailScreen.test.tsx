import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MobileSummary } from "../api/mobileSummary";
import { PlanDetailScreen } from "./PlanDetailScreen";

describe("PlanDetailScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("renders machine types as user-facing labels", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: [],
      dirty_basket: {
        item_count: 0,
        load_percent: 0,
        oldest_days: 0,
        urgent_count: 0,
        status_label: "空篮",
        recommendation: "请选择脏衣篮衣物。",
        next_action: "去脏衣篮",
        items: [],
      },
      wardrobe: {
        items: [
          {
            item_id: "bedding",
            name: "床单被套",
            user_note: "",
            user_notes: [],
            wear_count_since_wash: 1,
            wash_count: 0,
            material_ratios: { cotton: 1 },
            colors: ["white"],
            risks: {},
          },
        ],
      },
      campus_context: {
        all_machines: [],
        available_machines: [],
        queue_estimates: [],
        weather: {},
        drying_context: {},
        pricing_rules: {},
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
            warnings: ["床品单独成桶"],
          },
        ],
        estimated_cost_yuan: 4,
        estimated_duration_minutes: 35,
        summary: "床品单独占用标准洗衣机。",
        global_warnings: [],
      },
      report: {
        title: "report",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } as MobileSummary;

    render(<PlanDetailScreen onBack={vi.fn()} mobileSummary={mobileSummary} />);

    expect(screen.getByText("1 个洗护批次")).toBeInTheDocument();
    expect(screen.getByText("床品单独洗 · 标准")).toBeInTheDocument();
    expect(screen.getByText("洗衣机")).toBeInTheDocument();
    expect(screen.queryByText("standard_washer")).not.toBeInTheDocument();
    expect(screen.queryByText(/后端|LaundryPlan|large-bedding/)).not.toBeInTheDocument();
  });

  it("does not mention a large washer in the static fallback", () => {
    render(<PlanDetailScreen onBack={vi.fn()} />);

    expect(screen.queryByText(/大件机/)).not.toBeInTheDocument();
  });

  it("labels manual buckets by method and blocked washer buckets by the missing machine", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: ["silk-1", "tee-1"],
      dirty_basket: {
        item_count: 2,
        load_percent: 40,
        oldest_days: 0,
        urgent_count: 0,
        status_label: "可清洗",
        recommendation: "分开处理。",
        next_action: "查看本次方案",
        items: [],
      },
      wardrobe: {
        items: [
          {
            item_id: "silk-1",
            name: "真丝衬衫",
            user_note: "",
            user_notes: [],
            wear_count_since_wash: 1,
            wash_count: 0,
            material_ratios: { silk: 1 },
            colors: ["white"],
            risks: {},
          },
          {
            item_id: "tee-1",
            name: "白色棉 T 恤",
            user_note: "",
            user_notes: [],
            wear_count_since_wash: 1,
            wash_count: 0,
            material_ratios: { cotton: 1 },
            colors: ["white"],
            risks: {},
          },
        ],
      },
      campus_context: {
        all_machines: [],
        available_machines: [],
        queue_estimates: [],
        weather: {},
        drying_context: {},
        pricing_rules: {},
      },
      plan: {
        buckets: [
          {
            bucket_id: "hand-wash",
            item_ids: ["silk-1"],
            wash_method: "hand_wash",
            machine_type: "unknown",
            program: "hand_wash",
            detergent_ml: 8,
            use_laundry_bag: false,
            dry_method: "air_dry",
            warnings: [],
          },
          {
            bucket_id: "light-standard-2",
            item_ids: ["tee-1"],
            wash_method: "machine_wash",
            machine_type: "standard_washer",
            program: "standard",
            detergent_ml: 24,
            use_laundry_bag: false,
            dry_method: "air_dry",
            warnings: ["没有空闲洗衣机"],
          },
        ],
        estimated_cost_yuan: null,
        estimated_duration_minutes: null,
        summary: "手洗桶和缺洗衣机桶都保留。",
        global_warnings: [],
      },
      report: {
        title: "本次校园洗衣方案",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } as MobileSummary;

    render(<PlanDetailScreen onBack={vi.fn()} mobileSummary={mobileSummary} />);

    expect(screen.getAllByText("手洗").length).toBeGreaterThan(0);
    expect(screen.getAllByText("没有空闲洗衣机").length).toBeGreaterThan(0);
    expect(screen.getByText(/白色棉 T 恤 · 机洗 · 自然晾干/)).toBeInTheDocument();
    expect(screen.queryByText("设备待确认")).not.toBeInTheDocument();
    expect(screen.queryByText("待机器")).not.toBeInTheDocument();
  });

  it("does not claim no clothes were selected when selected clothes fail to produce buckets", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: ["tee-1"],
      dirty_basket: {
        item_count: 1,
        load_percent: 20,
        oldest_days: 0,
        urgent_count: 0,
        status_label: "可清洗",
        recommendation: "查看本次方案。",
        next_action: "查看本次方案",
        items: [],
      },
      wardrobe: {
        items: [
          {
            item_id: "tee-1",
            name: "白色棉 T 恤",
            user_note: "",
            user_notes: [],
            wear_count_since_wash: 1,
            wash_count: 0,
            material_ratios: { cotton: 1 },
            colors: ["white"],
            risks: {},
          },
        ],
      },
      campus_context: {
        all_machines: [],
        available_machines: [],
        queue_estimates: [],
        weather: {},
        drying_context: {},
        pricing_rules: {},
      },
      plan: {
        buckets: [],
        estimated_cost_yuan: null,
        estimated_duration_minutes: null,
        summary: "当前机器条件不足以生成完整方案，建议稍后刷新。",
        global_warnings: ["未能匹配到可用机器，请检查机器状态或手动选择。"],
      },
      report: {
        title: "本次校园洗衣方案",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } as MobileSummary;

    render(<PlanDetailScreen onBack={vi.fn()} mobileSummary={mobileSummary} />);

    expect(screen.getByText("方案暂未生成")).toBeInTheDocument();
    expect(screen.getByText("待确认")).toBeInTheDocument();
    expect(screen.getByText("查看机器状态")).toBeInTheDocument();
    expect(screen.getByText("未能匹配到可用机器，请检查机器状态或手动选择。")).toBeInTheDocument();
    expect(screen.queryByText("未选择衣物")).not.toBeInTheDocument();
  });
});
