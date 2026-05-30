import { describe, expect, it } from "vitest";
import { importantCareChips } from "./wardrobeCareText";

describe("importantCareChips", () => {
  it("does not mark non-machine-wash care tags as machine washable", () => {
    const chips = importantCareChips("洗涤方式：不可机洗（推断）");

    expect(chips.map((chip) => chip.label)).toContain("不可机洗");
    expect(chips.map((chip) => chip.label)).not.toContain("可机洗");
  });

  it("keeps explicit machine-wash care tags as machine washable", () => {
    const chips = importantCareChips("洗涤方式：机洗（推断）");

    expect(chips.map((chip) => chip.label)).toContain("可机洗");
  });
});
