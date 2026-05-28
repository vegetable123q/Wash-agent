import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddClothingScreen } from "./AddClothingScreen";

describe("AddClothingScreen", () => {
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  it("submits manual wardrobe input to the backend and reports success", async () => {
    const onSaved = vi.fn();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: "created",
        item: {
          item_id: "wm-user-purple-hoodie",
          name: "清华紫连帽卫衣",
          material_ratios: { 棉: 1 },
          colors: ["紫色"],
          risks: {},
          user_notes: ["之前烘干后轻微缩水"],
        },
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AddClothingScreen onBack={() => undefined} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole("button", { name: "文字输入" }));
    fireEvent.change(screen.getByLabelText("衣物名称"), { target: { value: "清华紫连帽卫衣" } });
    fireEvent.change(screen.getByLabelText("主要材质"), { target: { value: "棉" } });
    fireEvent.change(screen.getByLabelText("颜色"), { target: { value: "紫色" } });
    fireEvent.change(screen.getByLabelText("个人备注"), { target: { value: "之前烘干后轻微缩水" } });
    fireEvent.click(screen.getByRole("button", { name: /保存到衣柜/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/wardrobe/items",
      expect.objectContaining({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: "清华紫连帽卫衣",
          material: "棉",
          colors: "紫色",
          note: "之前烘干后轻微缩水",
          image_filename: "",
        }),
      }),
    );
    expect(await screen.findByText("保存成功，已加入衣柜")).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
  });
});
