import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { LaundryRoomScreen } from "./LaundryRoomScreen";

describe("LaundryRoomScreen", () => {
  it("shows the latest campus machine context and queue estimates", () => {
    render(<LaundryRoomScreen onNavigate={vi.fn()} />);

    expect(screen.getByRole("heading", { name: "请选择宿舍楼" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "楼栋与数据源" })).toBeInTheDocument();
    expect(screen.getByText("CleverSchool + 海乐生活")).toBeInTheDocument();
    expect(screen.getByText("偏好")).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "队列估算" })).toBeInTheDocument();
    expect(screen.getByText("standard_washer")).toBeInTheDocument();
    expect(screen.getByText("large_washer")).toBeInTheDocument();
    expect(screen.getByText("dryer")).toBeInTheDocument();
  });
});
