import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { TodayScreen } from "./TodayScreen";

describe("TodayScreen", () => {
  it("shows a backend-aligned plan summary on the dashboard", () => {
    render(<TodayScreen onNavigate={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "后端方案摘要" })).toBeInTheDocument();
    expect(screen.getByText("4 个洗护批次")).toBeInTheDocument();
    expect(screen.getByText("预计 ¥24")).toBeInTheDocument();
    expect(screen.getByText("机器占用约 154 分钟")).toBeInTheDocument();
    expect(screen.getByText("高风险衣物已单独处理")).toBeInTheDocument();
    expect(screen.queryByText(/大件机/)).not.toBeInTheDocument();
  });
});
