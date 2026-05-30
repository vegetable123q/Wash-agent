import type { Tone } from "../data/washMateContent";

export interface CareChip {
  label: string;
  tone: Tone;
}

export interface WardrobeCareMemory {
  careTags: string;
  suggestion: string;
  sourceText: string;
}

const careLabelNames = ["洗涤方式", "洗涤温度", "漂白", "翻转烘干", "熨烫", "干洗", "自然晾干"];

export function splitWardrobeCareMemory(text?: string): WardrobeCareMemory {
  const sourceText = String(text ?? "").trim();
  if (!sourceText) {
    return { careTags: "", suggestion: "", sourceText: "" };
  }

  const lines = sourceText.split(/\n+/).map((line) => line.trim()).filter(Boolean);
  if (!lines.length) {
    return { careTags: "", suggestion: "", sourceText: "" };
  }

  const firstCareLineIndex = lines.findIndex(isCareTagLine);
  if (firstCareLineIndex < 0) {
    return { careTags: "", suggestion: sourceText, sourceText };
  }

  const careTags = lines[firstCareLineIndex];
  const suggestion = lines.filter((_, index) => index !== firstCareLineIndex).join("\n");
  return { careTags, suggestion, sourceText };
}

export function importantCareChips(careTags: string): CareChip[] {
  const tags = String(careTags ?? "");
  const chips: CareChip[] = [];

  if (/不可(?:翻转)?烘干|不可.*烘干/.test(tags)) {
    chips.push({ label: "不可烘干", tone: "orange" });
  }
  if (/冷水|低温水|30\s*°?\s*C|30℃/.test(tags)) {
    chips.push({ label: "冷水", tone: "blue" });
  }
  if (/手洗/.test(tags)) {
    chips.push({ label: "手洗", tone: "orange" });
  }
  if (/不可漂白/.test(tags)) {
    chips.push({ label: "不可漂白", tone: "amber" });
  }
  if (/阴干|悬挂晾干|自然晾干/.test(tags)) {
    chips.push({ label: "阴干", tone: "teal" });
  }
  if (/机洗/.test(tags) && chips.length === 0) {
    chips.push({ label: "可机洗", tone: "teal" });
  }

  return uniqueCareChips(chips).slice(0, 2);
}

function isCareTagLine(line: string): boolean {
  return careLabelNames.some((name) => line.includes(`${name}：`) || line.includes(`${name}:`));
}

function uniqueCareChips(chips: CareChip[]): CareChip[] {
  const seen = new Set<string>();
  return chips.filter((chip) => {
    if (seen.has(chip.label)) return false;
    seen.add(chip.label);
    return true;
  });
}
