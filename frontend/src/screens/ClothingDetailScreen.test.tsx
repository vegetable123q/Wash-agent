import { cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { emptyModelHubConfig } from "../api/modelHubConfig";
import { generateRiskDescription } from "../api/llmSummary";
import type { WardrobeSummaryItem } from "../api/mobileSummary";
import { ClothingDetailScreen } from "./ClothingDetailScreen";

vi.mock("../api/llmSummary", async () => {
  const actual = await vi.importActual<typeof import("../api/llmSummary")>("../api/llmSummary");
  return {
    ...actual,
    generateRiskDescription: vi.fn(),
  };
});

describe("ClothingDetailScreen", () => {
  beforeEach(() => {
    vi.mocked(generateRiskDescription).mockReset();
  });

  afterEach(() => {
    cleanup();
  });

  it("clears the previous LLM risk text when switching backend items", async () => {
    vi.mocked(generateRiskDescription)
      .mockResolvedValueOnce({ source: "llm", text: "第一件的 AI 风险描述" })
      .mockResolvedValueOnce({ source: "fallback", text: "第二件 fallback" });

    const { rerender } = render(
      <ClothingDetailScreen
        onBack={vi.fn()}
        backendItem={wardrobeItem({
          item_id: "tee-1",
          name: "白色 T 恤",
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: { shrink: "medium" },
        })}
        modelHubConfig={configuredModelHub}
      />,
    );

    expect(await screen.findByText("第一件的 AI 风险描述")).toBeInTheDocument();

    rerender(
      <ClothingDetailScreen
        onBack={vi.fn()}
        backendItem={wardrobeItem({
          item_id: "wool-1",
          name: "羊毛开衫",
          material_ratios: { wool: 1 },
          colors: ["beige"],
          risks: { deform: "high" },
        })}
        modelHubConfig={configuredModelHub}
      />,
    );

    await waitFor(() => expect(generateRiskDescription).toHaveBeenCalledTimes(2));
    expect(screen.queryByText("第一件的 AI 风险描述")).not.toBeInTheDocument();
    expect(screen.getByText(/羊毛开衫：变形风险较高/)).toBeInTheDocument();
  });
});

const configuredModelHub = {
  ...emptyModelHubConfig,
  apikey: "test-modelhub-key",
};

function wardrobeItem(overrides: Partial<WardrobeSummaryItem>): WardrobeSummaryItem {
  return {
    item_id: "item-1",
    name: "衣物",
    user_note: "",
    user_notes: [],
    wear_count_since_wash: 1,
    wash_count: 0,
    material_ratios: {},
    colors: [],
    risks: {},
    ...overrides,
  };
}
