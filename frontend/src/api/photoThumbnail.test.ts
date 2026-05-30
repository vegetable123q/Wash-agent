import { afterEach, describe, expect, it, vi } from "vitest";
import { fileToThumbnailDataUrl } from "./photoThumbnail";

describe("fileToThumbnailDataUrl", () => {
  const originalImage = globalThis.Image;
  const originalCanvasRenderingContext2D = globalThis.CanvasRenderingContext2D;
  const originalCreateElement = document.createElement.bind(document);

  afterEach(() => {
    if (originalImage) {
      globalThis.Image = originalImage;
    } else {
      // @ts-expect-error tests restore the optional browser global
      delete globalThis.Image;
    }
    if (originalCanvasRenderingContext2D) {
      globalThis.CanvasRenderingContext2D = originalCanvasRenderingContext2D;
    } else {
      // @ts-expect-error tests restore the optional browser global
      delete globalThis.CanvasRenderingContext2D;
    }
    vi.restoreAllMocks();
  });

  it("stores an uploaded clothing photo as a bounded thumbnail data URL", async () => {
    const drawImage = vi.fn();
    const toDataURL = vi.fn().mockReturnValue("data:image/jpeg;base64,thumbnail");
    const canvas = {
      width: 0,
      height: 0,
      getContext: vi.fn().mockReturnValue({ drawImage }),
      toDataURL,
    } as unknown as HTMLCanvasElement;

    class MockImage {
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      naturalWidth = 4000;
      naturalHeight = 3000;
      width = 4000;
      height = 3000;

      set src(_value: string) {
        this.onload?.();
      }
    }

    globalThis.Image = MockImage as unknown as typeof Image;
    globalThis.CanvasRenderingContext2D = class {} as typeof CanvasRenderingContext2D;
    vi.spyOn(document, "createElement").mockImplementation((tagName: string) => {
      if (tagName === "canvas") return canvas;
      return originalCreateElement(tagName);
    });

    const result = await fileToThumbnailDataUrl(new File(["large photo"], "shirt.jpg", { type: "image/jpeg" }));

    expect(result).toBe("data:image/jpeg;base64,thumbnail");
    expect(canvas.width).toBe(512);
    expect(canvas.height).toBe(384);
    expect(drawImage).toHaveBeenCalledWith(expect.any(MockImage), 0, 0, 512, 384);
    expect(toDataURL).toHaveBeenCalledWith("image/jpeg", 0.72);
  });
});
