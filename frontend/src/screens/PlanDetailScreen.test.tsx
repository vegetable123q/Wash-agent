import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MobileSummary } from "../api/mobileSummary";
import { PlanDetailScreen } from "./PlanDetailScreen";

describe("PlanDetailScreen", () => {
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

  it("shows non-duplicated global constraint warnings with friendly labels", () => {
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
        next_action: "查看方案",
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
            warnings: ["推荐使用 washer-1，位置 1F，程序 standard。"],
          },
        ],
        estimated_cost_yuan: 3.5,
        estimated_duration_minutes: 40,
        summary: "浅色衣物标准洗。",
        global_warnings: [
          "预计费用 3.5 元超过预算 3 元。",
          "standard_washer 预计等待 12 分钟超过最大等待 5 分钟。",
          "推荐使用 washer-1，位置 1F，程序 standard。",
        ],
      },
      report: {
        title: "report",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } as MobileSummary;

    const { container } = render(<PlanDetailScreen onBack={vi.fn()} mobileSummary={mobileSummary} />);

    expect(screen.getByRole("heading", { name: "本次约束提醒" })).toBeInTheDocument();
    expect(screen.getByText("预计费用 3.5 元超过预算 3 元。")).toBeInTheDocument();
    expect(screen.getByText("洗衣机 预计等待 12 分钟超过最大等待 5 分钟。")).toBeInTheDocument();
    expect(container.textContent).not.toContain("standard_washer");
    expect(screen.getAllByText(/推荐使用/)).toHaveLength(1);
  });
});
