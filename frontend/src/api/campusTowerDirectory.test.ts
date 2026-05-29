import { describe, expect, it } from "vitest";
import { listCampusTowerOptions, resolveCampusTowerByName } from "./campusTowerDirectory";

describe("campusTowerDirectory", () => {
  it("lists the configured campus dorm directory instead of only two sample dorms", () => {
    const options = listCampusTowerOptions();

    expect(options.length).toBeGreaterThan(50);
    expect(options.map((option) => option.name)).toEqual(expect.arrayContaining([
      "南区9号楼",
      "南区21号楼",
      "紫荆1号楼",
      "紫荆23号楼",
      "双清公寓北楼",
      "红杉学生公寓",
    ]));
    expect(options).not.toContainEqual(expect.objectContaining({ providerKeys: expect.anything() }));
  });

  it("keeps provider keys private while resolving them for API requests", () => {
    expect(resolveCampusTowerByName("南区9号楼").providerKeys).toEqual({
      cleverschool: "u06r9wt",
      haier: "43750",
    });
    expect(resolveCampusTowerByName("紫荆3号楼").providerKeys).toEqual({
      cleverschool: "kerspue",
      haier: "43756",
    });
  });
});
