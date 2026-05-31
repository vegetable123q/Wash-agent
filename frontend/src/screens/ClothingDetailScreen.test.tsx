import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
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

  it("does not tell light backend items to wash with dark clothes", () => {
    render(
      <ClothingDetailScreen
        onBack={vi.fn()}
        backendItem={wardrobeItem({
          item_id: "white-tee",
          name: "白色 T 恤",
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        })}
      />,
    );

    expect(screen.queryByText("与深色衣物同桶")).not.toBeInTheDocument();
    expect(screen.getByText("按浅色衣物清洗")).toBeInTheDocument();
  });

  it("offers wardrobe-memory actions for backend items", () => {
    const onRecordWear = vi.fn();
    const onAddToBasket = vi.fn();

    render(
      <ClothingDetailScreen
        onBack={vi.fn()}
        backendItem={wardrobeItem({
          item_id: "tee-1",
          name: "白色 T 恤",
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        })}
        onRecordWear={onRecordWear}
        onAddToBasket={onAddToBasket}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "记录穿着" }));
    fireEvent.click(screen.getByRole("button", { name: "加入脏衣篮" }));

    expect(onRecordWear).toHaveBeenCalledWith("tee-1");
    expect(onAddToBasket).toHaveBeenCalledWith("tee-1");
  });

  it("lets backend item wear count be edited manually", () => {
    const onSetWearCount = vi.fn();

    render(
      <ClothingDetailScreen
        onBack={vi.fn()}
        backendItem={wardrobeItem({
          item_id: "tee-1",
          name: "白色 T 恤",
          wear_count_since_wash: 2,
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        })}
        onSetWearCount={onSetWearCount}
      />,
    );

    fireEvent.change(screen.getByLabelText("手动修改穿着次数"), { target: { value: "5" } });
    fireEvent.click(screen.getByRole("button", { name: "保存次数" }));

    expect(onSetWearCount).toHaveBeenCalledWith("tee-1", 5);
  });

  it("opens an editable wardrobe form from the detail action", async () => {
    const onUpdateItem = vi.fn();

    render(
      <ClothingDetailScreen
        onBack={vi.fn()}
        backendItem={wardrobeItem({
          item_id: "tee-1",
          name: "白色 T 恤",
          user_note: "常穿，容易出汗",
          category: "上衣",
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        })}
        onUpdateItem={onUpdateItem}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "编辑衣物" }));
    fireEvent.change(screen.getByLabelText("衣物名称"), { target: { value: "白色长袖 T 恤" } });
    fireEvent.change(screen.getByLabelText("个人备注"), { target: { value: "领口容易变形" } });
    fireEvent.click(screen.getByRole("button", { name: "保存修改" }));

    await waitFor(() =>
      expect(onUpdateItem).toHaveBeenCalledWith("tee-1", expect.objectContaining({
        name: "白色长袖 T 恤",
        material: "cotton 100%",
        colors: "white",
        note: "领口容易变形",
        category: "上衣",
      })),
    );
  });

  it("disables the dirty-basket action when the item is already selected", () => {
    render(
      <ClothingDetailScreen
        onBack={vi.fn()}
        backendItem={wardrobeItem({
          item_id: "tee-1",
          name: "白色 T 恤",
          material_ratios: { cotton: 1 },
          colors: ["white"],
          risks: {},
        })}
        isInDirtyBasket={true}
        onAddToBasket={vi.fn()}
      />,
    );

    expect(screen.getByRole("button", { name: "已在脏衣篮" })).toBeDisabled();
  });

  it("filters invalid material ratios in backend detail text", () => {
    const { container } = render(
      <ClothingDetailScreen
        onBack={vi.fn()}
        backendItem={wardrobeItem({
          item_id: "silk-scarf",
          name: "silk scarf",
          material_ratios: { cotton: Number.NaN, wool: -0.2, silk: 0.4 },
          colors: ["blue"],
          risks: {},
        })}
      />,
    );

    expect(container.textContent).not.toContain("NaN");
    expect(container.textContent).not.toContain("-20%");
    expect(container.textContent).toContain("silk 40%");
  });

  it("shows detailed care labels and advice on the detail page", () => {
    render(
      <ClothingDetailScreen
        onBack={vi.fn()}
        backendItem={wardrobeItem({
          item_id: "vest-1",
          name: "黑白拼色背心",
          user_note: "洗涤方式：机洗（推断）；洗涤温度：冷水（推断）；漂白：不可漂白（推断）；翻转烘干：不可翻转烘干（推断）；自然晾干：阴干（推断）\n黑白拼色设计极易串色，建议冷水装洗衣袋轻柔机洗，切勿长时间浸泡或使用热水。",
          user_notes: [],
          material_ratios: { cotton: 1 },
          colors: ["黑白拼色"],
          risks: { color_bleed: "medium" },
        })}
      />,
    );

    expect(screen.getByRole("heading", { name: "洗护标签" })).toBeInTheDocument();
    expect(screen.getByText(/洗涤方式：机洗（推断）/)).toBeInTheDocument();
    expect(screen.getByText(/自然晾干：阴干（推断）/)).toBeInTheDocument();
    expect(screen.getByText(/黑白拼色设计极易串色/)).toBeInTheDocument();
  });

  it("does not title non-machine-wash backend items as light-color machine wash", () => {
    render(
      <ClothingDetailScreen
        onBack={vi.fn()}
        backendItem={wardrobeItem({
          item_id: "silver-jacket",
          name: "银色机能风多口袋外套",
          user_note: "洗涤方式：不可机洗（推断）；自然晾干：阴干（推断）\n银色涂层材质较特殊，建议冷水轻柔手洗。",
          material_ratios: { polyester: 1 },
          colors: ["银色"],
          risks: {},
        })}
      />,
    );

    expect(screen.getByText("不可机洗，单独手洗")).toBeInTheDocument();
    expect(screen.queryByText("按浅色衣物清洗")).not.toBeInTheDocument();
    expect(screen.queryByText("可机洗")).not.toBeInTheDocument();
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
