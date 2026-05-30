import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MobileSummary } from "../api/mobileSummary";
import { WardrobeScreen } from "./WardrobeScreen";

const emptySummary = {
  source: "backend",
  selected_laundry_item_ids: [],
  dirty_basket: {
    item_count: 0,
    load_percent: 0,
    oldest_days: 0,
    urgent_count: 0,
    status_label: "空篮",
    recommendation: "先把脏衣服加入脏衣篮，再生成本次洗衣方案。",
    next_action: "去衣柜选择这批要洗的衣物",
    items: [],
  },
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

const selectableSummary: MobileSummary = {
  ...emptySummary,
  selected_laundry_item_ids: ["tee-1"],
  dirty_basket: {
    item_count: 1,
    load_percent: 30,
    oldest_days: 0,
    urgent_count: 0,
    status_label: "还没满桶",
    recommendation: "普通衣物可继续攒；运动衣、贴身衣物或潮湿衣物建议别久放。",
    next_action: "继续攒或先洗急用衣物",
    items: [],
  },
  wardrobe: {
    items: [
      {
        item_id: "tee-1",
        name: "白色棉 T 恤",
        user_note: "明天要穿",
        user_notes: ["明天要穿"],
        wear_count_since_wash: 2,
        wash_count: 0,
        material_ratios: { cotton: 1 },
        colors: ["white"],
        risks: {},
        category: "上衣",
      },
      {
        item_id: "hoodie-1",
        name: "灰色连帽卫衣",
        user_note: "周末穿",
        user_notes: ["周末穿"],
        wear_count_since_wash: 1,
        wash_count: 0,
        material_ratios: { cotton: 0.8, polyester: 0.2 },
        colors: ["gray"],
        risks: {},
        category: "上衣",
      },
      {
        item_id: "jeans-1",
        name: "深色牛仔裤",
        user_note: "耐穿",
        user_notes: ["耐穿"],
        wear_count_since_wash: 3,
        wash_count: 2,
        material_ratios: { cotton: 0.98, elastane: 0.02 },
        colors: ["dark blue"],
        risks: { color_bleed: "medium" },
        category: "裤装",
      },
      {
        item_id: "bedding-1",
        name: "宿舍床单",
        user_note: "每周换洗",
        user_notes: ["每周换洗"],
        wear_count_since_wash: 0,
        wash_count: 1,
        material_ratios: { cotton: 1 },
        colors: ["blue"],
        risks: {},
        category: "床品",
      },
      {
        item_id: "coat-1",
        name: "黑色羽绒服",
        user_note: "洗涤方式：机洗（推断）；洗涤温度：冷水（推断）；漂白：不可漂白（推断）；翻转烘干：不可翻转烘干（推断）；自然晾干：阴干（推断）\n黑色羽绒服建议冷水轻柔机洗，不可长时间浸泡。",
        user_notes: ["洗涤方式：机洗（推断）；洗涤温度：冷水（推断）；漂白：不可漂白（推断）；翻转烘干：不可翻转烘干（推断）；自然晾干：阴干（推断）\n黑色羽绒服建议冷水轻柔机洗，不可长时间浸泡。"],
        wear_count_since_wash: 1,
        wash_count: 0,
        material_ratios: { polyester: 1 },
        colors: ["black"],
        risks: {},
        category: "外套",
        photo_data_url: "data:image/png;base64,Y29hdA==",
      },
    ],
  },
};

describe("WardrobeScreen", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("shows an empty state when the connected backend has no wardrobe items", () => {
    const onNavigate = vi.fn();

    render(<WardrobeScreen mobileSummary={emptySummary} onNavigate={onNavigate} />);

    expect(screen.getByText("还没有衣物记录")).toBeInTheDocument();
    expect(screen.getByText("添加第一件衣物后，衣柜会显示材质、风险、穿着和洗涤次数。")).toBeInTheDocument();
    expect(screen.queryByText("白色纯棉 T 恤")).not.toBeInTheDocument();

    fireEvent.click(screen.getByRole("button", { name: "添加第一件衣物" }));
    expect(onNavigate).toHaveBeenCalledWith("addClothing");
  });

  it("shows saved clothes as categorized inventory without dirty-basket controls", () => {
    render(<WardrobeScreen mobileSummary={selectableSummary} onNavigate={() => undefined} />);

    expect(screen.queryByRole("heading", { name: "脏衣篮" })).not.toBeInTheDocument();
    expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
    expect(screen.queryByText("加入本次")).not.toBeInTheDocument();
    expect(screen.queryByText("本次清洗")).not.toBeInTheDocument();

    expect(screen.getByRole("heading", { name: "上衣" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "裤装" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "床品" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "外套" })).toBeInTheDocument();
    expect(screen.getByText("白色棉 T 恤")).toBeInTheDocument();
    expect(screen.getByText("灰色连帽卫衣")).toBeInTheDocument();
    expect(screen.getByText("深色牛仔裤")).toBeInTheDocument();
    expect(screen.getByText("宿舍床单")).toBeInTheDocument();
    expect(screen.getByText("黑色羽绒服")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "黑色羽绒服 照片" })).toHaveAttribute(
      "src",
      "data:image/png;base64,Y29hdA==",
    );
  });

  it("keeps wardrobe cards compact by showing only key tags, not full care advice", () => {
    render(<WardrobeScreen mobileSummary={selectableSummary} onNavigate={() => undefined} />);

    expect(screen.getByText("冷水")).toBeInTheDocument();
    expect(screen.getByText("不可烘干")).toBeInTheDocument();
    expect(screen.queryByText(/黑色羽绒服建议冷水轻柔机洗/)).not.toBeInTheDocument();
    expect(screen.queryByText(/洗涤方式：机洗/)).not.toBeInTheDocument();
  });

  it("does not label non-machine-wash wardrobe cards as machine washable", () => {
    render(
      <WardrobeScreen
        mobileSummary={{
          ...emptySummary,
          wardrobe: {
            items: [
              {
                item_id: "silver-jacket",
                name: "银色机能风外套",
                user_note: "洗涤方式：不可机洗（推断）",
                user_notes: ["洗涤方式：不可机洗（推断）"],
                wear_count_since_wash: 1,
                wash_count: 0,
                material_ratios: { polyester: 1 },
                colors: ["银色"],
                risks: {},
                category: "外套",
              },
            ],
          },
        }}
        onNavigate={() => undefined}
      />,
    );

    expect(screen.getAllByText("不可机洗").length).toBeGreaterThan(0);
    expect(screen.queryByText("可机洗")).not.toBeInTheDocument();
  });

  it("disables every delete button while a delete is pending", async () => {
    let resolveDelete: () => void = () => undefined;
    const onDeleteItem = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          resolveDelete = resolve;
        }),
    );

    const { container } = render(
      <WardrobeScreen
        mobileSummary={selectableSummary}
        onNavigate={vi.fn()}
        onDeleteItem={onDeleteItem}
      />,
    );

    const deleteButtons = Array.from(container.querySelectorAll<HTMLButtonElement>(".danger-icon-button"));
    expect(deleteButtons.length).toBeGreaterThan(1);

    fireEvent.click(deleteButtons[0]);

    await waitFor(() => expect(deleteButtons[0]).toBeDisabled());
    expect(deleteButtons[1]).toBeDisabled();

    fireEvent.click(deleteButtons[1]);
    expect(onDeleteItem).toHaveBeenCalledTimes(1);

    resolveDelete();
    await waitFor(() => expect(deleteButtons[0]).not.toBeDisabled());
  });

  it("asks for confirmation before clearing the entire wardrobe", () => {
    const onClearWardrobe = vi.fn();
    const confirm = vi.fn(() => true);
    vi.stubGlobal("confirm", confirm);

    render(
      <WardrobeScreen
        mobileSummary={selectableSummary}
        onNavigate={vi.fn()}
        onClearWardrobe={onClearWardrobe}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "清空衣柜" }));

    expect(confirm).toHaveBeenCalledWith("确定删除衣柜里的所有衣物吗？");
    expect(onClearWardrobe).toHaveBeenCalledTimes(1);
  });

  it("keeps wardrobe data when the clear confirmation is cancelled", () => {
    const onClearWardrobe = vi.fn();
    vi.stubGlobal("confirm", vi.fn(() => false));

    render(
      <WardrobeScreen
        mobileSummary={selectableSummary}
        onNavigate={vi.fn()}
        onClearWardrobe={onClearWardrobe}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "清空衣柜" }));

    expect(onClearWardrobe).not.toHaveBeenCalled();
  });
});
