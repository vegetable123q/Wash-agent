import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { machines } from "../data/washMateContent";
import { MachineDetailScreen } from "./MachineDetailScreen";

describe("MachineDetailScreen", () => {
  it("shows backend MachineInfo fields and pricing contract details", () => {
    render(<MachineDetailScreen onBack={vi.fn()} staticMachine={machines[1]} />);

    expect(screen.getByRole("heading", { name: "标准筒 A02" })).toBeInTheDocument();
    expect(screen.getByText("machine_id")).toBeInTheDocument();
    expect(screen.getByText("washer-standard-2")).toBeInTheDocument();
    expect(screen.getByText("MachineInfo")).toBeInTheDocument();
    expect(screen.getByText("quick / standard / heavy")).toBeInTheDocument();
    expect(screen.getByText("washer_types.standard_washer")).toBeInTheDocument();
  });

  it("shows an explicit missing state instead of guessing a machine", () => {
    render(<MachineDetailScreen onBack={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "未找到机器记录" })).toBeInTheDocument();
  });
});
