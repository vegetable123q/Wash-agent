import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { MachineDetailScreen } from "./MachineDetailScreen";

describe("MachineDetailScreen", () => {
  it("shows backend MachineInfo fields and pricing contract details", () => {
    render(<MachineDetailScreen onBack={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "标准筒 A02" })).toBeInTheDocument();
    expect(screen.getByText("machine_id")).toBeInTheDocument();
    expect(screen.getByText("washer-standard-2")).toBeInTheDocument();
    expect(screen.getByText("MachineInfo")).toBeInTheDocument();
    expect(screen.getByText("quick / standard / heavy")).toBeInTheDocument();
    expect(screen.getByText("washer_types.standard_washer")).toBeInTheDocument();
  });
});
