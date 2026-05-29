import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
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
});
