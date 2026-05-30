const DEFAULT_MAX_DIMENSION = 512;
const DEFAULT_JPEG_QUALITY = 0.72;

interface ThumbnailOptions {
  maxDimension?: number;
  quality?: number;
}

export async function fileToThumbnailDataUrl(file: File, options: ThumbnailOptions = {}): Promise<string> {
  const sourceDataUrl = await fileToDataUrl(file);
  const canvasContext = createCanvasContext();
  if (!canvasContext || typeof Image === "undefined") {
    return sourceDataUrl;
  }

  let image: HTMLImageElement;
  try {
    image = await loadImage(sourceDataUrl);
  } catch {
    return sourceDataUrl;
  }

  const { canvas, context } = canvasContext;
  const dimensions = thumbnailDimensions(
    image.naturalWidth || image.width,
    image.naturalHeight || image.height,
    options.maxDimension ?? DEFAULT_MAX_DIMENSION,
  );
  if (!dimensions.width || !dimensions.height) {
    return sourceDataUrl;
  }

  canvas.width = dimensions.width;
  canvas.height = dimensions.height;
  context.drawImage(image, 0, 0, dimensions.width, dimensions.height);

  const thumbnailDataUrl = canvas.toDataURL("image/jpeg", options.quality ?? DEFAULT_JPEG_QUALITY);
  return thumbnailDataUrl.startsWith("data:image/") ? thumbnailDataUrl : sourceDataUrl;
}

function createCanvasContext(): { canvas: HTMLCanvasElement; context: CanvasRenderingContext2D } | null {
  if (typeof document === "undefined" || typeof CanvasRenderingContext2D === "undefined") {
    return null;
  }

  const canvas = document.createElement("canvas");
  if (typeof canvas.getContext !== "function" || typeof canvas.toDataURL !== "function") {
    return null;
  }

  try {
    const context = canvas.getContext("2d");
    return context ? { canvas, context } : null;
  } catch {
    return null;
  }
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error("image load failed"));
    image.src = dataUrl;
  });
}

function thumbnailDimensions(width: number, height: number, maxDimension: number): { width: number; height: number } {
  if (width <= 0 || height <= 0 || maxDimension <= 0) {
    return { width: 0, height: 0 };
  }
  const scale = Math.min(1, maxDimension / Math.max(width, height));
  return {
    width: Math.max(1, Math.round(width * scale)),
    height: Math.max(1, Math.round(height * scale)),
  };
}

async function fileToDataUrl(file: File): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return `data:${imageDataUrlMimeType(file)};base64,${btoa(binary)}`;
}

function imageDataUrlMimeType(file: File): string {
  const explicitType = file.type.trim().toLowerCase();
  if (explicitType.startsWith("image/")) return explicitType;
  const lowerName = file.name.toLowerCase();
  if (lowerName.endsWith(".jpg") || lowerName.endsWith(".jpeg")) return "image/jpeg";
  if (lowerName.endsWith(".png")) return "image/png";
  if (lowerName.endsWith(".webp")) return "image/webp";
  if (lowerName.endsWith(".gif")) return "image/gif";
  if (lowerName.endsWith(".heic")) return "image/heic";
  return "image/jpeg";
}
