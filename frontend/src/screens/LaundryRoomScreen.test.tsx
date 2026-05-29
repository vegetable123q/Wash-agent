import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { PRICING_RULES } from "../api/pricingRules";
import { LaundryRoomScreen } from "./LaundryRoomScreen";

describe("LaundryRoomScreen", () => {
  it("hides internal provider keys and raw machine enum values", () => {
    render(
      <LaundryRoomScreen
        onNavigate={vi.fn()}
        userProfile={{
          displayName: "小徐",
          dormName: "南区21号楼",
          latestPickupTime: "22:30",
          allowDryer: false,
        }}
        mobileSummary={{
          source: "backend",
          selected_laundry_item_ids: [],
          dirty_basket: {
            item_count: 0,
            load_percent: 0,
            oldest_days: 0,
            urgent_count: 0,
            status_label: "空篮",
            recommendation: "先选择衣物。",
            next_action: "去衣柜选择这批要洗的衣物",
            items: [],
          },
          campus_status: {
            state: "live",
            dorm_name: "南区21号楼",
            message: "已读取 3 台实时机器记录。",
            updated_at: "2026-05-29T14:30:00.000Z",
          },
          campus_towers: [
            {
              name: "南区21号楼",
            },
          ],
          wardrobe: { items: [] },
          campus_context: {
            all_machines: [
              {
                machine_id: "455514",
                location: "南区21号楼 一层",
                machine_type: "standard_washer",
                status: "available",
                remaining_minutes: null,
                price_yuan: null,
                modes: [],
              },
              {
                machine_id: "wm10003112",
                location: "南区21号楼 一层",
                machine_type: "shoe_washer",
                status: "available",
                remaining_minutes: null,
                price_yuan: null,
                modes: [],
              },
              {
                machine_id: "764255",
                location: "南区21号楼 六层",
                machine_type: "dryer",
                status: "running",
                remaining_minutes: 18,
                price_yuan: null,
                modes: [],
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
                modes: [],
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
              {
                machine_type: "shoe_washer",
                total_count: 1,
                available_count: 1,
                running_count: 0,
                out_of_service_count: 0,
                unknown_count: 0,
                estimated_wait_minutes: 0,
              },
              {
                machine_type: "dryer",
                total_count: 1,
                available_count: 0,
                running_count: 1,
                out_of_service_count: 0,
                unknown_count: 0,
                estimated_wait_minutes: 18,
              },
            ],
            weather: {},
            drying_context: {},
            pricing_rules: { ...PRICING_RULES },
          },
          plan: {
            buckets: [],
            estimated_cost_yuan: 0,
            estimated_duration_minutes: 0,
            summary: "",
            global_warnings: [],
          },
          report: {
            title: "",
            sections: {},
            savings_notes: [],
            risk_notes: [],
          },
        }}
      />,
    );

    expect(screen.getAllByRole("heading", { name: "南区21号楼" }).length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: "队列估算" })).toBeInTheDocument();
    expect(screen.getByText("洗衣机")).toBeInTheDocument();
    expect(screen.getByText("洗鞋机")).toBeInTheDocument();
    expect(screen.getByText("烘干机")).toBeInTheDocument();
    expect(screen.queryByText("价格：接口未提供")).not.toBeInTheDocument();
    expect(screen.getByText("价格：¥3-4")).toBeInTheDocument();
    expect(screen.getByText("价格：¥2.5-4")).toBeInTheDocument();
    expect(screen.getByText("价格：¥2-4")).toBeInTheDocument();
    expect(screen.queryByText(/容量/)).not.toBeInTheDocument();
    expect(screen.queryByText("容量未知")).not.toBeInTheDocument();
    expect(screen.queryByText("价格待定")).not.toBeInTheDocument();
    expect(screen.queryByText("tower_key")).not.toBeInTheDocument();
    expect(screen.queryByText(/cleverschool:/)).not.toBeInTheDocument();
    expect(screen.queryByText(/haier:/)).not.toBeInTheDocument();
    expect(screen.queryByText("standard_washer")).not.toBeInTheDocument();
    expect(screen.queryByText("shoe_washer")).not.toBeInTheDocument();
    expect(screen.queryByText("large_washer")).not.toBeInTheDocument();
    expect(screen.queryByText("大件机")).not.toBeInTheDocument();
    expect(document.querySelectorAll(".machine-card.machine-card-equal")).toHaveLength(3);
  });
});
