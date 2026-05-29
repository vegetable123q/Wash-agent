import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { machines } from "../data/washMateContent";
import { MachineDetailScreen } from "./MachineDetailScreen";

describe("MachineDetailScreen", () => {
  afterEach(() => {
    cleanup();
  });

  it("shows live machine location first and explains missing API fields", () => {
    render(
      <MachineDetailScreen
        onBack={vi.fn()}
        backendMachine={{
          machine_id: "455514",
          location: "南区21号楼 一层",
          machine_type: "standard_washer",
          status: "available",
          capacity_kg: null,
          remaining_minutes: null,
          price_yuan: null,
          modes: [],
        }}
      />,
    );

    expect(screen.getByRole("heading", { name: "标准洗衣机 · 南区21号楼 一层" })).toBeInTheDocument();
    expect(screen.getByText("设备编号")).toBeInTheDocument();
    expect(screen.getByText("455514")).toBeInTheDocument();
    expect(screen.getByText("容量：接口未提供")).toBeInTheDocument();
    expect(screen.getAllByText("价格：接口未提供").length).toBeGreaterThan(0);
    expect(screen.queryByText("价格待定")).not.toBeInTheDocument();
  });

  it("shows user-facing machine details without raw backend field names", () => {
    render(<MachineDetailScreen onBack={vi.fn()} staticMachine={machines[1]} />);

    expect(screen.getByRole("heading", { name: "标准筒 A02" })).toBeInTheDocument();
    expect(screen.getByText("设备编号")).toBeInTheDocument();
    expect(screen.getByText("washer-standard-2")).toBeInTheDocument();
    expect(screen.getByText("标准洗衣机")).toBeInTheDocument();
    expect(screen.getByText("快洗 / 标准 / 强力")).toBeInTheDocument();
    expect(screen.queryByText("machine_id")).not.toBeInTheDocument();
    expect(screen.queryByText("machine_type")).not.toBeInTheDocument();
    expect(screen.queryByText("standard_washer")).not.toBeInTheDocument();
    expect(screen.queryByText("quick / standard / heavy")).not.toBeInTheDocument();
    expect(screen.queryByText("washer_types.standard_washer")).not.toBeInTheDocument();
  });

  it("shows an explicit missing state instead of guessing a machine", () => {
    render(<MachineDetailScreen onBack={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "未找到机器记录" })).toBeInTheDocument();
  });
});
