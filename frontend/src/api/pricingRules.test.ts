import { describe, expect, it } from "vitest";
import { buildCampusContextForDorm, type CampusMachineTransport } from "./campusMachineApi";
import { PRICING_RULES } from "./pricingRules";

describe("pricing rules", () => {
  it("keeps manufacturer-specific programs and removes capacity from live machines", async () => {
    expect(PRICING_RULES.provider_programs?.haier.wash_programs.standard).toEqual({
      label: "标准",
      price_yuan: 3.5,
      duration_minutes: 40,
    });
    expect(PRICING_RULES.provider_programs?.cleverschool.wash_programs.standard).toEqual({
      label: "标准洗",
      price_yuan: 3.5,
      duration_minutes: 40,
    });
    expect(PRICING_RULES.provider_programs?.cleverschool.wash_programs.spin).toBeUndefined();

    const transport: CampusMachineTransport = async ({ url }) => {
      if (url.endsWith("/device/status")) {
        return {
          success: true,
          data: [
            {
              tower: "南区21号楼",
              macUnionCode: "洗衣机 455514",
              floorName: "一层",
              status: "状态:待机 更新时间:2026-05-29 13:20:00",
            },
          ],
        };
      }
      return { code: 0, data: { items: [] } };
    };

    const context = await buildCampusContextForDorm("南区21号楼", { transport });

    expect(context.all_machines[0]).not.toHaveProperty("capacity_kg");
  });
});
