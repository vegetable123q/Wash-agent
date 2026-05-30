import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MobileSummary } from "../api/mobileSummary";
import { PRICING_RULES } from "../api/pricingRules";
import { machines } from "../data/washMateContent";
import { MachineDetailScreen } from "./MachineDetailScreen";

describe("MachineDetailScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows live machine location first and explains missing API fields", () => {
    const { container } = render(
      <MachineDetailScreen
        onBack={vi.fn()}
        backendMachine={{
          machine_id: "455514",
          location: "南区21号楼 一层",
          machine_type: "standard_washer",
          status: "available",
          remaining_minutes: null,
          price_yuan: null,
          modes: [],
          provider: "cleverschool",
        }}
        pricingRules={{ ...PRICING_RULES }}
      />,
    );

    expect(screen.getByRole("heading", { name: "洗衣机 · 南区21号楼 一层" })).toBeInTheDocument();
    expect(screen.queryByText("详情")).not.toBeInTheDocument();
    expect(screen.getByText("设备编号")).toBeInTheDocument();
    expect(screen.getByText("455514")).toBeInTheDocument();
    expect(screen.queryByText(/容量/)).not.toBeInTheDocument();
    expect(screen.queryByText("价格：接口未提供")).not.toBeInTheDocument();
    expect(screen.queryByText(/价格：¥3-4/)).not.toBeInTheDocument();
    expect(screen.queryByText(/等待未知 等待/)).not.toBeInTheDocument();
    expect(screen.getByText("无需等待")).toBeInTheDocument();
    expect(screen.getByText("快速洗")).toBeInTheDocument();
    expect(screen.getByText("¥3 · 30 分")).toBeInTheDocument();
    expect(screen.getByText("标准洗")).toBeInTheDocument();
    expect(screen.getByText("¥3.5 · 40 分")).toBeInTheDocument();
    expect(screen.getByText("大件洗")).toBeInTheDocument();
    expect(screen.getByText("¥4 · 50 分")).toBeInTheDocument();
    expect(container.querySelector(".mode-option.selected")).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "价格信息" })).not.toBeInTheDocument();
    expect(screen.queryByText("价格待定")).not.toBeInTheDocument();
  });

  it("uses provider-specific functions for live machines", () => {
    render(
      <MachineDetailScreen
        onBack={vi.fn()}
        backendMachine={{
          machine_id: "85774956",
          location: "南区21号楼 学生公寓21号楼2层烘干机",
          machine_type: "dryer",
          status: "available",
          remaining_minutes: null,
          price_yuan: null,
          modes: [],
          provider: "haier",
        }}
        pricingRules={{ ...PRICING_RULES }}
      />,
    );

    expect(screen.getByText("高温")).toBeInTheDocument();
    expect(screen.getByText("¥4 · 90 分")).toBeInTheDocument();
    expect(screen.getByText("中温")).toBeInTheDocument();
    expect(screen.getByText("¥3 · 60 分")).toBeInTheDocument();
    expect(screen.getByText("低温")).toBeInTheDocument();
    expect(screen.getByText("¥2 · 50 分")).toBeInTheDocument();
    expect(screen.queryByText("强力烘")).not.toBeInTheDocument();
  });

  it("does not show unknown wait copy when a running machine has no remaining time", () => {
    const { container } = render(
      <MachineDetailScreen
        onBack={vi.fn()}
        backendMachine={{
          machine_id: "85774951",
          location: "南区21号楼 南区21号楼6层烘干机",
          machine_type: "dryer",
          status: "running",
          remaining_minutes: null,
          price_yuan: null,
          modes: [],
          provider: "haier",
        }}
        pricingRules={{ ...PRICING_RULES }}
      />,
    );

    expect(container.querySelector(".panel-metrics span")?.textContent).toBe("运行中");
    expect(screen.getAllByText("运行中").length).toBeGreaterThan(0);
    expect(screen.queryByText("剩余时间未知")).not.toBeInTheDocument();
    expect(screen.queryByText(/等待未知/)).not.toBeInTheDocument();
  });

  it.each([
    [Number.POSITIVE_INFINITY, "Infinity"],
    [1.5, "1.5"],
  ])("does not show invalid running remaining time %s", (remainingMinutes, rawText) => {
    const { container } = render(
      <MachineDetailScreen
        onBack={vi.fn()}
        backendMachine={{
          machine_id: "85774952",
          location: "南区21号楼 南区21号楼6层烘干机",
          machine_type: "dryer",
          status: "running",
          remaining_minutes: remainingMinutes,
          price_yuan: null,
          modes: [],
          provider: "haier",
        }}
        pricingRules={{ ...PRICING_RULES }}
      />,
    );

    expect(container.textContent).not.toContain(rawText);
    expect(container.querySelector(".panel-metrics span")?.textContent).toBe("运行中");
  });

  it("shows user-facing machine details without raw backend field names", () => {
    render(<MachineDetailScreen onBack={vi.fn()} staticMachine={machines[1]} />);

    expect(screen.getByRole("heading", { name: "标准筒 A02" })).toBeInTheDocument();
    expect(screen.getByText("设备编号")).toBeInTheDocument();
    expect(screen.getByText("washer-standard-2")).toBeInTheDocument();
    expect(screen.getByText("洗衣机")).toBeInTheDocument();
    expect(screen.getByText("快洗 / 标准 / 大物")).toBeInTheDocument();
    expect(screen.queryByText("machine_id")).not.toBeInTheDocument();
    expect(screen.queryByText("machine_type")).not.toBeInTheDocument();
    expect(screen.queryByText("standard_washer")).not.toBeInTheDocument();
    expect(screen.queryByText("quick / standard / large")).not.toBeInTheDocument();
    expect(screen.queryByText("washer_types.standard_washer")).not.toBeInTheDocument();
  });

  it("shows an explicit missing state instead of guessing a machine", () => {
    render(<MachineDetailScreen onBack={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "未找到机器记录" })).toBeInTheDocument();
  });

  it("shows the assigned live bucket instead of static bucket guesses", () => {
    render(
      <MachineDetailScreen
        onBack={vi.fn()}
        backendMachine={{
          machine_id: "washer-1",
          location: "紫荆1号楼 六层",
          machine_type: "standard_washer",
          status: "available",
          remaining_minutes: null,
          price_yuan: null,
          modes: ["standard"],
          provider: "cleverschool",
        }}
        mobileSummary={summaryWithPlan({
          buckets: [
            {
              bucket_id: "light-standard",
              item_ids: ["tee-1"],
              wash_method: "machine_wash",
              machine_type: "standard_washer",
              machine_id: "washer-1",
              machine_location: "紫荆1号楼 六层",
              program: "standard",
              detergent_ml: 24,
              use_laundry_bag: true,
              dry_method: "air_dry",
              warnings: [],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("浅色标准洗")).toBeInTheDocument();
    expect(screen.getByText("白色棉 T 恤")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "用于浅色标准洗" })).toBeDisabled();
    expect(screen.queryByText("深色衣物桶")).not.toBeInTheDocument();
    expect(screen.queryByText("浅色快速洗")).not.toBeInTheDocument();
    expect(screen.queryByText("用于深色衣物桶")).not.toBeInTheDocument();
  });

  it("uses live excluded buckets instead of fixed unsuitable item copy", () => {
    render(
      <MachineDetailScreen
        onBack={vi.fn()}
        backendMachine={{
          machine_id: "washer-1",
          location: "紫荆1号楼 六层",
          machine_type: "standard_washer",
          status: "available",
          remaining_minutes: null,
          price_yuan: null,
          modes: ["standard"],
          provider: "cleverschool",
        }}
        mobileSummary={summaryWithPlan({
          wardrobeItems: [
            wardrobeItem("tee-1", "白色棉 T 恤"),
            wardrobeItem("silk-1", "真丝衬衫"),
          ],
          buckets: [
            {
              bucket_id: "light-standard",
              item_ids: ["tee-1"],
              wash_method: "machine_wash",
              machine_type: "standard_washer",
              machine_id: "washer-1",
              program: "standard",
              detergent_ml: 24,
              use_laundry_bag: false,
              dry_method: "air_dry",
              warnings: [],
            },
            {
              bucket_id: "hand-wash",
              item_ids: ["silk-1"],
              wash_method: "hand_wash",
              machine_type: "unknown",
              program: "hand_wash",
              detergent_ml: 8,
              use_laundry_bag: false,
              dry_method: "air_dry",
              warnings: ["材质易损，建议手洗。"],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("真丝衬衫不进共享机")).toBeInTheDocument();
    expect(screen.getByText("材质易损，建议手洗。")).toBeInTheDocument();
    expect(screen.queryByText("羊毛、真丝、正装")).not.toBeInTheDocument();
  });

  it("shows an explicit no-assignment state when the selected machine is not in the plan", () => {
    render(
      <MachineDetailScreen
        onBack={vi.fn()}
        backendMachine={{
          machine_id: "washer-unused",
          location: "紫荆1号楼 一层",
          machine_type: "standard_washer",
          status: "available",
          remaining_minutes: null,
          price_yuan: null,
          modes: ["standard"],
          provider: "cleverschool",
        }}
        mobileSummary={summaryWithPlan({
          buckets: [
            {
              bucket_id: "light-standard",
              item_ids: ["tee-1"],
              wash_method: "machine_wash",
              machine_type: "standard_washer",
              machine_id: "washer-1",
              program: "standard",
              detergent_ml: 24,
              use_laundry_bag: false,
              dry_method: "air_dry",
              warnings: [],
            },
          ],
        })}
      />,
    );

    expect(screen.getByText("本机未分配到本次方案")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "本机未分配到本次方案" })).toBeDisabled();
    expect(screen.queryByText("用于深色衣物桶")).not.toBeInTheDocument();
  });
});

function summaryWithPlan({
  buckets,
  wardrobeItems = [wardrobeItem("tee-1", "白色棉 T 恤")],
}: {
  buckets: MobileSummary["plan"]["buckets"];
  wardrobeItems?: MobileSummary["wardrobe"]["items"];
}): MobileSummary {
  return {
    source: "backend",
    selected_laundry_item_ids: wardrobeItems.map((item) => item.item_id),
    dirty_basket: {
      item_count: wardrobeItems.length,
      load_percent: 30,
      oldest_days: 0,
      urgent_count: 0,
      status_label: "可清洗",
      recommendation: "今晚处理。",
      next_action: "查看本次方案",
      items: [],
    },
    wardrobe: { items: wardrobeItems },
    campus_context: {
      all_machines: [],
      available_machines: [],
      queue_estimates: [],
      weather: {},
      drying_context: {},
      pricing_rules: {},
    },
    plan: {
      buckets,
      estimated_cost_yuan: 3.5,
      estimated_duration_minutes: 40,
      summary: "本次方案。",
      global_warnings: [],
    },
    report: {
      title: "本次校园洗衣报告",
      sections: {},
      savings_notes: [],
      risk_notes: [],
    },
  };
}

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
