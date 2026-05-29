import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import type { MobileSummary } from "../api/mobileSummary";
import { DirtyBasketScreen } from "./DirtyBasketScreen";

const summary: MobileSummary = {
  source: "backend",
  selected_laundry_item_ids: ["sport-tee-1"],
  dirty_basket: {
    item_count: 1,
    load_percent: 30,
    oldest_days: 3,
    urgent_count: 0,
    status_label: "久放需洗",
    recommendation: "有衣物已放 3 天，建议今天处理，运动衣、贴身衣物或潮湿衣物不要继续攒。",
    next_action: "查看本次方案",
    items: [
      {
        item_id: "sport-tee-1",
        name: "运动速干短袖",
        added_at: "2026-05-26T08:00:00.000Z",
        added_at_source: "known",
        days_in_basket: 3,
        warning_label: "久放易有味",
      },
    ],
  },
  wardrobe: {
    items: [
      {
        item_id: "sport-tee-1",
        name: "运动速干短袖",
        user_note: "运动后穿过",
        user_notes: ["运动后穿过"],
        wear_count_since_wash: 1,
        wash_count: 0,
        material_ratios: { polyester: 1 },
        colors: ["blue"],
        risks: {},
      },
      {
        item_id: "jeans-1",
        name: "黑色牛仔裤",
        user_note: "",
        user_notes: [],
        wear_count_since_wash: 2,
        wash_count: 0,
        material_ratios: { cotton: 1 },
        colors: ["black"],
        risks: { color_bleed: "high" },
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
    summary: "",
    global_warnings: [],
  },
  report: {
    title: "",
    sections: {},
    savings_notes: [],
    risk_notes: [],
  },
};

describe("DirtyBasketScreen", () => {
  it("lets the user manage dirty clothes and see how long they have waited", () => {
    const onToggleItem = vi.fn();
    const onNavigate = vi.fn();

    render(
      <DirtyBasketScreen
        mobileSummary={summary}
        onBack={vi.fn()}
        onNavigate={onNavigate}
        onToggleItem={onToggleItem}
      />,
    );

    expect(screen.getByRole("heading", { name: "脏衣篮" })).toBeInTheDocument();
    expect(screen.getByText("1 件在盆里")).toBeInTheDocument();
    expect(screen.getByText("1 件在盆里").closest(".dirty-basket-card-sticky")).toBeInTheDocument();
    expect(screen.getByText("最久 3 天")).toBeInTheDocument();
    expect(screen.getByText("久放易有味")).toBeInTheDocument();
    expect(screen.getByText("已放 3 天")).toBeInTheDocument();

    fireEvent.click(screen.getByRole("checkbox", { name: "移出脏衣篮 运动速干短袖" }));
    expect(onToggleItem).toHaveBeenCalledWith("sport-tee-1");

    fireEvent.click(screen.getByRole("checkbox", { name: "加入脏衣篮 黑色牛仔裤" }));
    expect(onToggleItem).toHaveBeenCalledWith("jeans-1");

    fireEvent.click(screen.getByRole("button", { name: "查看本次方案" }));
    expect(onNavigate).toHaveBeenCalledWith("planDetail");
  });
});
