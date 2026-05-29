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
      wardrobe: { items: [] },
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

    expect(screen.getByText("洗衣机")).toBeInTheDocument();
    expect(screen.queryByText("standard_washer")).not.toBeInTheDocument();
  });

  it("does not mention a large washer in the static fallback", () => {
    render(<PlanDetailScreen onBack={vi.fn()} />);

    expect(screen.queryByText(/大件机/)).not.toBeInTheDocument();
  });
});
