import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { WardrobeCategory, WardrobeSummaryItem } from "../api/types";
import { OutfitWikiScreen } from "./OutfitWikiScreen";

describe("OutfitWikiScreen", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
  });

  it("explains missing bottoms directly in the recommendation area", async () => {
    const onNavigate = vi.fn();
    render(
      <OutfitWikiScreen
        wardrobeItems={[wardrobeItem("top-1", "白色 T 恤", "上衣")]}
        onNavigate={onNavigate}
      />,
    );

    expect(await screen.findByText("缺少裤装/裙装，暂时无法推荐完整穿搭。")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: "添加下衣" }));

    expect(onNavigate).toHaveBeenCalledWith("addClothing");
  });
});

function wardrobeItem(itemId: string, name: string, category: WardrobeCategory): WardrobeSummaryItem {
  return {
    item_id: itemId,
    name,
    category,
    user_note: "",
    user_notes: [],
    wear_count_since_wash: 0,
    wash_count: 0,
    material_ratios: {},
    colors: [],
    risks: {},
  };
}
