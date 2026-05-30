import { describe, expect, it } from "vitest";
import { buildProfileFromInput } from "./clothingExtractor";

describe("clothingExtractor", () => {
  it("does not match care aliases inside unrelated English words", () => {
    const profile = buildProfileFromInput({
      item_id: "item-1",
      name: "gentleman cotton shirt",
      material_text: "cotton",
      colors_text: "white",
      user_note: "bleachable fabric",
    });

    expect(profile.care_recommendations).not.toContain("gentle_cycle");
    expect(profile.care_warnings).not.toContain("do_not_bleach");
  });

  it("filters explicit zero material ratios", () => {
    const mixed = buildProfileFromInput({
      item_id: "item-1",
      name: "wool scarf",
      material_text: "cotton 0%, wool 100%",
      colors_text: "gray",
      user_note: "",
    });
    const zeroOnly = buildProfileFromInput({
      item_id: "item-2",
      name: "unknown scarf",
      material_text: "cotton 0%",
      colors_text: "gray",
      user_note: "",
    });

    expect(mixed.material_ratios).toEqual({ wool: 1 });
    expect(zeroOnly.material_ratios).toEqual({});
  });
});
