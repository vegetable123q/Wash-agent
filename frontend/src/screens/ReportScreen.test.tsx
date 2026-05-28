import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { ReportScreen } from "./ReportScreen";

describe("ReportScreen", () => {
  it("shows the backend WashReport section structure", () => {
    render(<ReportScreen />);

    expect(screen.getByRole("heading", { name: "报告结构" })).toBeInTheDocument();
    expect(screen.getByText("洗衣步骤")).toBeInTheDocument();
    expect(screen.getByText("费用和时间")).toBeInTheDocument();
    expect(screen.getByText("机器环境")).toBeInTheDocument();
    expect(screen.getByText("风险提醒")).toBeInTheDocument();
  });
});
