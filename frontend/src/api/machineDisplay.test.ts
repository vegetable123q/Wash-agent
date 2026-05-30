import { describe, expect, it } from "vitest";
import { machineDisplayLabel } from "./machineDisplay";

describe("machineDisplayLabel", () => {
  it("does not append a duplicate machine type when the location already names it", () => {
    expect(
      machineDisplayLabel({
        machine_id: "85774993",
        machine_location: "紫荆1号楼 紫荆1号楼6层烘干机",
        machine_type: "dryer",
      }),
    ).toBe("紫荆1号楼6层烘干机");
  });
});
