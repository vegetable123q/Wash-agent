import type { ClothingArtKind } from "../data/washMateContent";

interface ClothingArtProps {
  kind: ClothingArtKind;
  size?: "sm" | "md" | "lg";
}

export function ClothingArt({ kind, size = "md" }: ClothingArtProps) {
  return <span className={`cloth-art cloth-${kind} cloth-${size}`} aria-hidden="true" />;
}
