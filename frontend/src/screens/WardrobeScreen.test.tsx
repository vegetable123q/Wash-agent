import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { WardrobeScreen } from "./WardrobeScreen";
import type { MobileSummary } from "../api/mobileSummary";

const emptySummary = {
  source: "backend",
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
    estimated_cost_yuan: null,
    estimated_duration_minutes: null,
    summary: "",
    global_warnings: [],
  },
  report: {
    title: "",
    sections: {},
    savings_notes: [],
    risk_notes: [],
  },
} satisfies MobileSummary;

describe("WardrobeScreen", () => {
  it("shows an empty state when the connected backend has no wardrobe items", () => {
    const onNavigate = vi.fn();

    render(<WardrobeScreen mobileSummary={emptySummary} onNavigate={onNavigate} />);

    expect(screen.getByText("还没有衣物记录")).toBeInTheDocument();
    expect(screen.getByText("添加第一件衣物后，衣柜会显示材质、风险、穿着和洗涤次数。")).toBeInTheDocument();
    expect(screen.queryByText("白色纯棉 T 恤")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "添加第一件衣物" }));
    expect(onNavigate).toHaveBeenCalledWith("addClothing");
  });
});
