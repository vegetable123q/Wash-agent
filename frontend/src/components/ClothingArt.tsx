import type { ClothingArtKind } from "../data/washMateContent";
import type { CSSProperties } from "react";

const CLOTHING_ART_COLOR_SWATCHES = [
  { terms: ["粉", "pink"], fill: "#e88faa" },
  { terms: ["多色", "彩色", "multicolor", "multi"], fill: "linear-gradient(135deg, #e88faa 0%, #f0c66f 34%, #4f7fcf 68%, #8b58b8 100%)" },
  { terms: ["白", "white", "cream", "ivory"], fill: "#eef2f4" },
  { terms: ["银", "silver"], fill: "#b7c0ca" },
  { terms: ["灰", "gray", "grey"], fill: "#8c949c" },
  { terms: ["浅蓝", "light blue"], fill: "#8eb7df" },
  { terms: ["藏青", "深蓝", "navy"], fill: "#293a64" },
  { terms: ["蓝", "blue"], fill: "#4f7fcf" },
  { terms: ["紫", "purple"], fill: "#8b58b8" },
  { terms: ["红", "red"], fill: "#d94b52" },
  { terms: ["橙", "orange"], fill: "#de8b45" },
  { terms: ["黄", "yellow"], fill: "#d0a536" },
  { terms: ["绿", "green"], fill: "#3b9772" },
  { terms: ["卡其", "米", "beige", "khaki"], fill: "#c6a56d" },
  { terms: ["棕", "咖", "brown"], fill: "#8b5e3c" },
  { terms: ["黑", "深", "black", "dark"], fill: "#1d2229" },
] as const;

interface ClothingArtProps {
  kind: ClothingArtKind;
  size?: "sm" | "md" | "lg";
  colors?: string[];
}

export function ClothingArt({ kind, size = "md", colors = [] }: ClothingArtProps) {
  const fill = clothingArtFillForColors(colors);
  const style = fill ? ({ "--clothing-art-fill": fill } as CSSProperties) : undefined;
  return <span className={`cloth-art cloth-${kind} cloth-${size}`} style={style} aria-hidden="true" />;
}

function clothingArtFillForColors(colors: string[]): string {
  const text = colors.join(" ").toLowerCase();
  if (!text.trim()) return "";
  if (/(蓝|blue)/i.test(text) && /(深|dark|navy|藏青)/i.test(text)) {
    return "#293a64";
  }

  return CLOTHING_ART_COLOR_SWATCHES.find((swatch) => swatch.terms.some((term) => text.includes(term)))?.fill ?? "";
}
