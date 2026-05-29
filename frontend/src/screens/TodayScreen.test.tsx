import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MobileSummary } from "../api/mobileSummary";
import { TodayScreen } from "./TodayScreen";

describe("TodayScreen", () => {
  afterEach(() => {
    cleanup();
    vi.useRealTimers();
  });

  it("shows a user-facing plan summary on the dashboard", () => {
    render(<TodayScreen onNavigate={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "本次方案概览" })).toBeInTheDocument();
    expect(screen.getByText("4 个洗护批次")).toBeInTheDocument();
    expect(screen.getByText("预计 ¥24")).toBeInTheDocument();
    expect(screen.getByText("机器占用约 154 分钟")).toBeInTheDocument();
    expect(screen.getByText("高风险衣物已单独处理")).toBeInTheDocument();
    expect(screen.queryByText(/后端|LaundryPlan/)).not.toBeInTheDocument();
    expect(screen.queryByText(/大件机/)).not.toBeInTheDocument();
  });

  it("does not show static clothes when the connected wardrobe has no selected laundry items", () => {
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: [],
      dirty_basket: {
        item_count: 0,
        load_percent: 0,
        oldest_days: 0,
        urgent_count: 0,
        status_label: "空篮",
        recommendation: "先把脏衣服加入脏衣篮，再生成本次洗衣方案。",
        next_action: "管理脏衣篮",
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
        buckets: [],
        estimated_cost_yuan: 0,
        estimated_duration_minutes: null,
        summary: "请选择本次要清洗的衣物，衣柜不会自动替你加入默认衣物。",
        global_warnings: [],
      },
      report: {
        title: "本次校园洗衣方案",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } satisfies MobileSummary;

    const onNavigate = vi.fn();
    const { container } = render(
      <TodayScreen
        backendStatus="connected"
        mobileSummary={mobileSummary}
        userProfile={{ displayName: "", dormName: "", latestPickupTime: "22:30", allowDryer: false, budgetYuan: null, maxWaitMinutes: null }}
        onNavigate={onNavigate}
      />,
    );

    expect(container.querySelector(".hero-number")?.textContent).toBe("暂无待洗");
    expect(screen.getByText("暂无建议时间")).toBeInTheDocument();
    expect(screen.queryByText("21:15")).not.toBeInTheDocument();
    expect(screen.getByText("暂无已选衣物")).toBeInTheDocument();
    expect(screen.getByText("点进脏衣篮选择这批要洗的衣物。")).toBeInTheDocument();
    expect(screen.queryByText("请到衣柜勾选这批要清洗的衣物。")).not.toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "管理脏衣篮" }));
    expect(onNavigate).toHaveBeenCalledWith("dirtyBasket");
    expect(screen.queryByText("白 T 恤")).not.toBeInTheDocument();
  });

  it("shows dirty basket progress for connected selected clothes", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-05-29T19:00:00.000+08:00"));
    const mobileSummary = {
      source: "backend",
      selected_laundry_item_ids: ["tee-1"],
      dirty_basket: {
        item_count: 1,
        load_percent: 30,
        oldest_days: 2,
        urgent_count: 0,
        status_label: "还没满桶",
        recommendation: "普通衣物可继续攒；运动衣、贴身衣物或潮湿衣物建议别久放。",
        next_action: "继续攒或先洗急用衣物",
        items: [
          {
            item_id: "tee-1",
            name: "白色棉 T 恤",
            added_at: "2026-05-27T12:00:00.000Z",
            added_at_source: "known",
            days_in_basket: 2,
            warning_label: "已放 2 天",
          },
        ],
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
            use_laundry_bag: true,
            dry_method: "air_dry",
            warnings: [],
          },
        ],
        estimated_cost_yuan: null,
        estimated_duration_minutes: null,
        summary: "这批脏衣篮衣物可进入方案。",
        global_warnings: [],
      },
      report: {
        title: "本次校园洗衣方案",
        sections: {},
        savings_notes: [],
        risk_notes: [],
      },
    } satisfies MobileSummary;

    const { container } = render(
      <TodayScreen
        backendStatus="connected"
        mobileSummary={mobileSummary}
        userProfile={{ displayName: "", dormName: "", latestPickupTime: "22:30", allowDryer: false, budgetYuan: null, maxWaitMinutes: null }}
        onNavigate={vi.fn()}
      />,
    );

    expect(container.querySelector(".hero-number")?.textContent).toBe("按方案清洗");
    expect(screen.getByText("建议开始 21:15")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "脏衣篮判断" })).toBeInTheDocument();
    expect(screen.getByText("还没满桶")).toBeInTheDocument();
    expect(screen.getByText("约 30% 桶")).toBeInTheDocument();
    expect(screen.getByText("最久 2 天")).toBeInTheDocument();
  });
});
