import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import { AddClothingScreen } from "./AddClothingScreen";

const modelHubConfig = {
  baseUrl: "https://modelhub.ailemac.com/v1beta",
  apikey: "test-modelhub-key",
  model_name: "gemini-3.1-pro-preview",
};

describe("AddClothingScreen", () => {
  afterEach(() => {
    cleanup();
    localStorage.clear();
    vi.unstubAllGlobals();
  });

  it("saves manual wardrobe input inside the APK without ModelHub settings", async () => {
    const onSaved = vi.fn();
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    render(<AddClothingScreen modelHubConfig={{ ...modelHubConfig, apikey: "" }} onBack={() => undefined} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole("button", { name: "文字输入" }));
    fireEvent.change(screen.getByLabelText("衣物名称"), { target: { value: "清华紫连帽卫衣" } });
    fireEvent.change(screen.getByLabelText("主要材质"), { target: { value: "棉" } });
    fireEvent.change(screen.getByLabelText("颜色"), { target: { value: "紫色" } });
    fireEvent.change(screen.getByLabelText("个人备注"), { target: { value: "之前烘干后轻微缩水" } });
    fireEvent.click(screen.getByRole("button", { name: /保存到衣柜/ }));

    expect(await screen.findByText("保存成功，已加入衣柜")).toBeInTheDocument();
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("does not save the same manual item again after a successful save", async () => {
    const onSaved = vi.fn();

    render(<AddClothingScreen modelHubConfig={{ ...modelHubConfig, apikey: "" }} onBack={() => undefined} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole("button", { name: "文字输入" }));
    fireEvent.change(screen.getByLabelText("衣物名称"), { target: { value: "清华紫连帽卫衣" } });
    fireEvent.click(screen.getByRole("button", { name: /保存到衣柜/ }));

    expect(await screen.findByText("保存成功，已加入衣柜")).toBeInTheDocument();
    fireEvent.click(screen.getByRole("button", { name: /保存到衣柜/ }));

    expect(JSON.parse(localStorage.getItem("washmate.localWardrobe") ?? "[]")).toHaveLength(1);
    expect(onSaved).toHaveBeenCalledTimes(1);
  });

  it("clears a save error after the user edits the draft", async () => {
    localStorage.setItem("washmate.localWardrobe", "{not-json");

    render(<AddClothingScreen modelHubConfig={{ ...modelHubConfig, apikey: "" }} onBack={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "文字输入" }));
    const nameInput = screen.getByLabelText("衣物名称");
    fireEvent.change(nameInput, { target: { value: "第一件衣物" } });
    fireEvent.click(screen.getByRole("button", { name: /保存到衣柜/ }));

    expect(await screen.findByText("本地衣柜数据无法读取")).toBeInTheDocument();

    fireEvent.change(nameInput, { target: { value: "第二件衣物" } });

    expect(screen.queryByText("本地衣柜数据无法读取")).not.toBeInTheDocument();
  });

  it("requires ModelHub settings before image recognition", () => {
    render(<AddClothingScreen modelHubConfig={{ ...modelHubConfig, apikey: "" }} onBack={() => undefined} />);

    expect(screen.getByRole("button", { name: "单件录入" })).toBeInTheDocument();
    expect(screen.getByText("识图需要先在“我的”页面输入 ModelHub baseUrl 和 apikey")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /拍照识别/ })).toBeDisabled();
  });

  it("extracts a long text description through ModelHub without showing image upload in text mode", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    is_clothing: true,
                    name: "灰色连帽卫衣",
                    material_ratios: { cotton: 0.7, polyester: 0.3 },
                    colors: ["gray"],
                    recommended_wash: "冷水机洗，避免高温烘干",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AddClothingScreen modelHubConfig={modelHubConfig} onBack={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "文字输入" }));
    expect(screen.queryByLabelText("上传衣物图片")).not.toBeInTheDocument();
    fireEvent.change(screen.getByLabelText("衣物描述"), {
      target: { value: "这件灰色连帽卫衣大概是棉混纺，之前高温烘干以后有点缩水，今晚想穿。" },
    });
    fireEvent.click(screen.getByRole("button", { name: /智能提取文字/ }));

    expect(await screen.findByDisplayValue("灰色连帽卫衣")).toBeInTheDocument();
    expect(screen.getByDisplayValue("棉 70%、聚酯纤维 30%")).toBeInTheDocument();
    expect(screen.getByDisplayValue("灰色")).toBeInTheDocument();
    const body = JSON.parse(String(fetchMock.mock.calls[0][1]?.body));
    expect(JSON.stringify(body)).not.toContain("inline_data");
  });

  it("recognizes multiple selected images and saves them together", async () => {
    const onSaved = vi.fn();
    const onBack = vi.fn();
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      is_clothing: true,
                      name: "白色棉 T 恤",
                      material_ratios: { cotton: 1 },
                      colors: ["white"],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          candidates: [
            {
              content: {
                parts: [
                  {
                    text: JSON.stringify({
                      is_clothing: true,
                      name: "黑色运动短裤",
                      material_ratios: { polyester: 1 },
                      colors: ["black"],
                    }),
                  },
                ],
              },
            },
          ],
        }),
      });
    vi.stubGlobal("fetch", fetchMock);

    const { container } = render(<AddClothingScreen modelHubConfig={modelHubConfig} onBack={onBack} onSaved={onSaved} />);

    fireEvent.click(screen.getByRole("button", { name: "批量录入" }));
    const files = [
      new File(["tee"], "tee.png", { type: "image/png" }),
      new File(["shorts"], "shorts.png", { type: "image/png" }),
    ];
    fireEvent.change(screen.getByLabelText("批量上传衣物图片"), { target: { files } });
    fireEvent.click(screen.getByRole("button", { name: /批量识别/ }));

    expect(await screen.findByText("已识别 2 件衣物，可统一保存。")).toBeInTheDocument();
    expect(screen.getByText("白色棉 T 恤")).toBeInTheDocument();
    expect(screen.getByText("黑色运动短裤")).toBeInTheDocument();
    const saveButton = screen.getByRole("button", { name: /统一保存 2 件衣物/ });
    fireEvent.click(saveButton);

    const savedMessage = await screen.findByText("已统一保存 2 件衣物");
    expect(savedMessage).toBeInTheDocument();
    const statusElements = Array.from(container.querySelectorAll("button,p"));
    expect(statusElements.indexOf(savedMessage)).toBeGreaterThan(statusElements.indexOf(saveButton));
    expect(onSaved).toHaveBeenCalledTimes(1);
    expect(onBack).toHaveBeenCalledTimes(1);
  });

  it("shows batch recognition progress with rotating tips while images are being recognized", async () => {
    let resolveFirst: (value: { ok: boolean; json: () => Promise<object> }) => void = () => undefined;
    let resolveSecond: (value: { ok: boolean; json: () => Promise<object> }) => void = () => undefined;
    const fetchMock = vi
      .fn()
      .mockImplementationOnce(
        () =>
          new Promise<{ ok: boolean; json: () => Promise<object> }>((resolve) => {
            resolveFirst = resolve;
          }),
      )
      .mockImplementationOnce(
        () =>
          new Promise<{ ok: boolean; json: () => Promise<object> }>((resolve) => {
            resolveSecond = resolve;
          }),
      );
    vi.stubGlobal("fetch", fetchMock);

    render(<AddClothingScreen modelHubConfig={modelHubConfig} onBack={() => undefined} />);

    fireEvent.click(screen.getByRole("button", { name: "批量录入" }));
    const files = [
      new File(["tee"], "tee.png", { type: "image/png" }),
      new File(["shorts"], "shorts.png", { type: "image/png" }),
    ];
    fireEvent.change(screen.getByLabelText("批量上传衣物图片"), { target: { files } });
    fireEvent.click(screen.getByRole("button", { name: /批量识别/ }));

    expect(await screen.findByRole("dialog", { name: "批量识别进度" })).toBeInTheDocument();
    expect(screen.getByRole("progressbar", { name: "批量识别进度" })).toHaveAttribute("aria-valuenow", "0");
    expect(screen.getByText("正在识别 1 / 2")).toBeInTheDocument();
    expect(screen.getByText("先识别衣物本身，再把吊牌/洗标补成备注。")).toBeInTheDocument();

    resolveFirst({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ name: "白色棉 T 恤" }) }] } }],
      }),
    });

    await waitFor(() =>
      expect(screen.getByRole("progressbar", { name: "批量识别进度" })).toHaveAttribute("aria-valuenow", "50"),
    );
    expect(screen.getByText("正在识别 2 / 2")).toBeInTheDocument();
    expect(screen.getByText("颜色和材质会影响分桶，深浅色先分开更稳。")).toBeInTheDocument();

    resolveSecond({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ name: "黑色运动短裤" }) }] } }],
      }),
    });

    expect(await screen.findByText("已识别 2 件衣物，可统一保存。")).toBeInTheDocument();
    expect(screen.queryByRole("dialog", { name: "批量识别进度" })).not.toBeInTheDocument();
  });

  it("locks the batch file input while batch recognition is pending", async () => {
    let resolveRecognition: (value: { ok: boolean; json: () => Promise<object> }) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<{ ok: boolean; json: () => Promise<object> }>((resolve) => {
            resolveRecognition = resolve;
          }),
      ),
    );

    const { container } = render(<AddClothingScreen modelHubConfig={modelHubConfig} onBack={() => undefined} />);

    const modeButtons = Array.from(container.querySelectorAll<HTMLButtonElement>(".segmented button"));
    fireEvent.click(modeButtons[1]);
    const input = container.querySelector<HTMLInputElement>('input[type="file"][multiple]');
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [new File(["tee"], "tee.png", { type: "image/png" })] } });
    const batchRecognizeButton = container.querySelector<HTMLButtonElement>(".secondary-button");
    expect(batchRecognizeButton).not.toBeNull();
    fireEvent.click(batchRecognizeButton!);

    expect(await screen.findByRole("dialog")).toBeInTheDocument();
    expect(input).toBeDisabled();

    resolveRecognition({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ name: "Test tee" }) }] } }],
      }),
    });

    expect(await screen.findByText("Test tee")).toBeInTheDocument();
    expect(input).not.toBeDisabled();
  });

  it("shows a clear reminder when the selected image has no clothing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({
          candidates: [{ content: { parts: [{ text: JSON.stringify({ is_clothing: false }) }] } }],
        }),
      }),
    );

    render(<AddClothingScreen modelHubConfig={modelHubConfig} onBack={() => undefined} />);

    const file = new File(["desk"], "desk.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("上传衣物图片"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /拍照识别/ }));

    expect(await screen.findByText(/没有识别到衣物/)).toBeInTheDocument();
  });

  it("keeps recognition disabled while a slow ModelHub request is in flight", async () => {
    let resolveRecognition: (value: { ok: boolean; json: () => Promise<object> }) => void = () => undefined;
    const fetchMock = vi.fn(
      () =>
        new Promise<{ ok: boolean; json: () => Promise<object> }>((resolve) => {
          resolveRecognition = resolve;
        }),
    );
    vi.stubGlobal("fetch", fetchMock);

    render(<AddClothingScreen modelHubConfig={modelHubConfig} onBack={() => undefined} />);

    const file = new File(["abc"], "shirt.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("上传衣物图片"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /拍照识别/ }));

    expect(await screen.findByRole("button", { name: /识别中/ })).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: /识别中/ }));
    expect(fetchMock).toHaveBeenCalledTimes(1);

    resolveRecognition({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ name: "蓝色衬衫" }) }] } }],
      }),
    });
    expect(await screen.findByText("识别完成，已填入可编辑字段")).toBeInTheDocument();
  });

  it("locks the text description input while text recognition is pending", async () => {
    let resolveRecognition: (value: { ok: boolean; json: () => Promise<object> }) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<{ ok: boolean; json: () => Promise<object> }>((resolve) => {
            resolveRecognition = resolve;
          }),
      ),
    );

    const { container } = render(<AddClothingScreen modelHubConfig={modelHubConfig} onBack={() => undefined} />);

    const modeButtons = Array.from(container.querySelectorAll<HTMLButtonElement>(".segmented button"));
    fireEvent.click(modeButtons[2]);
    const textarea = container.querySelector<HTMLTextAreaElement>(".text-extraction-box");
    expect(textarea).not.toBeNull();
    fireEvent.change(textarea!, { target: { value: "gray hoodie" } });
    const extractButton = container.querySelector<HTMLButtonElement>(".secondary-button");
    expect(extractButton).not.toBeNull();
    fireEvent.click(extractButton!);

    await waitFor(() => expect(extractButton).toBeDisabled());
    expect(textarea).toBeDisabled();

    resolveRecognition({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ name: "Test hoodie" }) }] } }],
      }),
    });

    expect(await screen.findByDisplayValue("Test hoodie")).toBeInTheDocument();
    expect(textarea).not.toBeDisabled();
  });

  it("locks the single image input while image recognition is pending", async () => {
    let resolveRecognition: (value: { ok: boolean; json: () => Promise<object> }) => void = () => undefined;
    vi.stubGlobal(
      "fetch",
      vi.fn(
        () =>
          new Promise<{ ok: boolean; json: () => Promise<object> }>((resolve) => {
            resolveRecognition = resolve;
          }),
      ),
    );

    const { container } = render(<AddClothingScreen modelHubConfig={modelHubConfig} onBack={() => undefined} />);

    const input = container.querySelector<HTMLInputElement>('input[type="file"]:not([multiple])');
    expect(input).not.toBeNull();
    fireEvent.change(input!, { target: { files: [new File(["tee"], "tee.png", { type: "image/png" })] } });
    const recognizeButton = container.querySelector<HTMLButtonElement>(".secondary-button");
    expect(recognizeButton).not.toBeNull();
    fireEvent.click(recognizeButton!);

    await waitFor(() => expect(recognizeButton).toBeDisabled());
    expect(input).toBeDisabled();

    resolveRecognition({
      ok: true,
      json: async () => ({
        candidates: [{ content: { parts: [{ text: JSON.stringify({ name: "Test tee" }) }] } }],
      }),
    });

    expect(await screen.findByDisplayValue("Test tee")).toBeInTheDocument();
    expect(input).not.toBeDisabled();
  });

  it("recognizes a selected image through ModelHub and fills the form", async () => {
    const fetchMock = vi.fn();
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        candidates: [
          {
            content: {
              parts: [
                {
                  text: JSON.stringify({
                    name: "蓝色棉质衬衫",
                    material_ratios: { cotton: 1 },
                    colors: ["blue"],
                    recommended_wash: "冷水机洗，悬挂晾干",
                  }),
                },
              ],
            },
          },
        ],
      }),
    });
    vi.stubGlobal("fetch", fetchMock);

    render(<AddClothingScreen modelHubConfig={modelHubConfig} onBack={() => undefined} />);

    const file = new File(["abc"], "shirt.png", { type: "image/png" });
    fireEvent.change(screen.getByLabelText("上传衣物图片"), { target: { files: [file] } });
    fireEvent.click(screen.getByRole("button", { name: /拍照识别/ }));

    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(fetchMock).toHaveBeenCalledWith(
      "https://modelhub.ailemac.com/v1beta/models/gemini-3.1-pro-preview:generateContent",
      expect.objectContaining({
        method: "POST",
      }),
    );
    const headers = fetchMock.mock.calls[0][1]?.headers as Headers;
    expect(headers.get("x-goog-api-key")).toBe("test-modelhub-key");
    expect(await screen.findByDisplayValue("蓝色棉质衬衫")).toBeInTheDocument();
    expect(screen.getByDisplayValue("棉 100%")).toBeInTheDocument();
    expect(screen.getByDisplayValue("蓝色")).toBeInTheDocument();
  });

});
