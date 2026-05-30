import { Directory, Filesystem } from "@capacitor/filesystem";

const PHOTO_DIR = "wardrobe-photos";

export async function saveWardrobePhotoDataUrl(itemId: string, dataUrl?: string): Promise<string | undefined> {
  const parsed = parseImageDataUrl(dataUrl);
  if (!parsed) return undefined;

  const path = `${PHOTO_DIR}/${safePathPart(itemId)}.${extensionForMimeType(parsed.mimeType)}`;
  await Filesystem.writeFile({
    path,
    directory: Directory.Data,
    data: parsed.base64,
    recursive: true,
  });
  return path;
}

export async function loadWardrobePhotoDataUrl(path?: string): Promise<string | undefined> {
  const cleanPath = String(path ?? "").trim();
  if (!cleanPath) return undefined;

  try {
    const result = await Filesystem.readFile({
      path: cleanPath,
      directory: Directory.Data,
    });
    if (result.data instanceof Blob) {
      return await blobToDataUrl(result.data);
    }
    return `data:${mimeTypeForPath(cleanPath)};base64,${result.data}`;
  } catch {
    return undefined;
  }
}

export async function deleteWardrobePhotoFile(path?: string): Promise<void> {
  const cleanPath = String(path ?? "").trim();
  if (!cleanPath) return;

  try {
    await Filesystem.deleteFile({
      path: cleanPath,
      directory: Directory.Data,
    });
  } catch {
    // Missing thumbnail files should not block deleting wardrobe metadata.
  }
}

function parseImageDataUrl(dataUrl?: string): { mimeType: string; base64: string } | null {
  const match = String(dataUrl ?? "").trim().match(/^data:(image\/[a-z0-9.+-]+);base64,([a-z0-9+/=\s]+)$/i);
  if (!match) return null;
  return {
    mimeType: match[1].toLowerCase(),
    base64: match[2].replace(/\s/g, ""),
  };
}

function safePathPart(value: string): string {
  const safe = value.trim().replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "");
  return safe || Date.now().toString(36);
}

function extensionForMimeType(mimeType: string): string {
  if (mimeType === "image/png") return "png";
  if (mimeType === "image/webp") return "webp";
  if (mimeType === "image/gif") return "gif";
  return "jpg";
}

function mimeTypeForPath(path: string): string {
  const lowerPath = path.toLowerCase();
  if (lowerPath.endsWith(".png")) return "image/png";
  if (lowerPath.endsWith(".webp")) return "image/webp";
  if (lowerPath.endsWith(".gif")) return "image/gif";
  return "image/jpeg";
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(reader.error ?? new Error("Failed to read photo file"));
    reader.readAsDataURL(blob);
  });
}
