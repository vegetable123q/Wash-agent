import { afterEach, describe, expect, it, vi } from "vitest";
import { buildCampusContextForDorm, buildQueueEstimates, type CampusMachineTransport } from "./campusMachineApi";

describe("campusMachineApi", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("builds machine context from configured dorm provider keys", async () => {
    const calls: Array<{ url: string; data: Record<string, unknown> }> = [];
    const transport: CampusMachineTransport = async ({ url, data }) => {
      calls.push({ url, data: data ?? {} });
      if (url.endsWith("/device/status")) {
        return {
          success: true,
          data: [
            {
              tower: "南区21号楼",
              macUnionCode: "洗衣机 455514",
              floorName: "一层",
              status: "状态:待机中 更新时间:2026-05-29 13:20:00",
            },
            {
              tower: "南区21号楼",
              macUnionCode: "烘干机 764255",
              floorName: "六层",
              status: "状态:工作中 剩余时间:18分钟 更新时间:2026-05-29 13:20:00",
            },
          ],
        };
      }
      if (url.endsWith("/position/deviceDetailPage")) {
        if (data?.categoryCode === "01") {
          return {
            code: 0,
            data: { items: [{ id: 85500828, name: "南区21号楼1层洗鞋机", state: 1 }] },
          };
        }
        return { code: 0, data: { items: [] } };
      }
      throw new Error(`unexpected url ${url}`);
    };

    const context = await buildCampusContextForDorm("南区21号楼", { transport });

    expect(calls.some((call) => call.data.towerKey === "97zas64")).toBe(true);
    expect(calls.some((call) => call.data.positionId === "43762")).toBe(true);
    expect(context.all_machines.map((machine) => machine.machine_type)).toEqual([
      "standard_washer",
      "dryer",
      "shoe_washer",
    ]);
    expect(context.all_machines[0]).toMatchObject({
      provider: "cleverschool",
      price_yuan: null,
      modes: [],
    });
    expect(context.all_machines[2]).toMatchObject({
      provider: "haier",
      machine_type: "shoe_washer",
    });
    expect(context.all_machines[0]).not.toHaveProperty("capacity_kg");
    expect(context.queue_estimates.map((estimate) => estimate.machine_type)).toEqual([
      "standard_washer",
      "dryer",
      "shoe_washer",
    ]);
    expect(context.available_machines.map((machine) => machine.machine_id)).toEqual(["455514", "85500828"]);
  });

  it("routes localhost web requests through Vite proxy endpoints", async () => {
    const fetchMock = vi.fn(async (url: string | URL | Request) => {
      const href = String(url);
      if (href === "/cleverschool-api/washapi4/device/status") {
        return {
          ok: true,
          json: async () => ({
            success: true,
            data: [
              {
                tower: "南区21号楼",
                macUnionCode: "洗衣机 455514",
                floorName: "一层",
                status: "状态:待机中 更新时间:2026-05-29 13:20:00",
              },
            ],
          }),
        };
      }
      if (href === "/haier-api/position/deviceDetailPage") {
        return {
          ok: true,
          json: async () => ({ code: 0, data: { items: [] } }),
        };
      }
      throw new Error(`unexpected fetch url ${href}`);
    });
    vi.stubGlobal("fetch", fetchMock);

    await buildCampusContextForDorm("南区21号楼");

    expect(fetchMock.mock.calls.map(([url]) => String(url))).toEqual([
      "/cleverschool-api/washapi4/device/status",
      "/haier-api/position/deviceDetailPage",
      "/haier-api/position/deviceDetailPage",
      "/haier-api/position/deviceDetailPage",
    ]);
  });

  it("recognizes common CleverSchool status synonyms", async () => {
    const transport: CampusMachineTransport = async ({ url }) => {
      if (url.endsWith("/device/status")) {
        return {
          success: true,
          data: [
            {
              tower: "南区21号楼",
              macUnionCode: "洗衣机 455514",
              floorName: "一层",
              status: "状态:空闲 更新时间:2026-05-29 13:20:00",
            },
            {
              tower: "南区21号楼",
              macUnionCode: "洗衣机 455515",
              floorName: "一层",
              status: "状态:使用中 剩余12分钟 更新时间:2026-05-29 13:20:00",
            },
          ],
        };
      }
      return { code: 0, data: { items: [] } };
    };

    const context = await buildCampusContextForDorm("南区21号楼", { transport });

    expect(context.all_machines.map((machine) => machine.status)).toEqual(["available", "running"]);
    expect(context.all_machines[1].remaining_minutes).toBe(12);
    expect(context.queue_estimates[0]).toMatchObject({
      available_count: 1,
      running_count: 1,
      estimated_wait_minutes: 0,
    });
  });

  it("parses Haier numeric state strings", async () => {
    const transport: CampusMachineTransport = async ({ url, data }) => {
      if (url.endsWith("/device/status")) {
        return { success: true, data: [] };
      }
      if (url.endsWith("/position/deviceDetailPage") && data?.categoryCode === "00") {
        return { code: 0, data: { items: [{ id: "h-1", name: "washer", state: "1" }] } };
      }
      return { code: 0, data: { items: [] } };
    };

    const context = await buildCampusContextForDorm("南区21号楼", { transport });

    expect(context.all_machines[0]).toMatchObject({
      machine_id: "h-1",
      status: "available",
    });
  });

  it("rejects non-finite Haier numeric identifiers", async () => {
    const transport: CampusMachineTransport = async ({ url, data }) => {
      if (url.endsWith("/device/status")) {
        return { success: true, data: [] };
      }
      if (url.endsWith("/position/deviceDetailPage") && data?.categoryCode === "00") {
        return { code: 0, data: { items: [{ id: Number.NaN, name: "washer", state: 1 }] } };
      }
      return { code: 0, data: { items: [] } };
    };

    await expect(buildCampusContextForDorm("南区21号楼", { transport })).rejects.toThrow("Missing required haier[0].id");
  });

  it("parses hour and minute remaining time", async () => {
    const transport: CampusMachineTransport = async ({ url }) => {
      if (url.endsWith("/device/status")) {
        return {
          success: true,
          data: [
            {
              tower: "南区21号楼",
              macUnionCode: "洗衣机 455515",
              floorName: "一层",
              status: "状态: 工作中 剩余1小时20分钟 更新时间:2026-05-29 13:20:00",
            },
          ],
        };
      }
      return { code: 0, data: { items: [] } };
    };

    const context = await buildCampusContextForDorm("南区21号楼", { transport });

    expect(context.all_machines[0].remaining_minutes).toBe(80);
    expect(context.queue_estimates[0].estimated_wait_minutes).toBe(80);
  });

  it("ignores invalid running remaining times in queue estimates", () => {
    const estimates = buildQueueEstimates([
      {
        machine_id: "washer-1",
        location: "1F",
        machine_type: "standard_washer",
        status: "running",
        remaining_minutes: 1.5,
        price_yuan: null,
        modes: [],
      },
    ]);

    expect(estimates[0].running_count).toBe(1);
    expect(estimates[0].estimated_wait_minutes).toBeNull();
  });

  it("classifies usable and unavailable status text explicitly", async () => {
    const transport: CampusMachineTransport = async ({ url }) => {
      if (url.endsWith("/device/status")) {
        return {
          success: true,
          data: [
            {
              tower: "南区21号楼",
              macUnionCode: "洗衣机 455514",
              floorName: "一层",
              status: "状态: 可使用 更新时间:2026-05-29 13:20:00",
            },
            {
              tower: "南区21号楼",
              macUnionCode: "洗衣机 455515",
              floorName: "一层",
              status: "状态: 不可使用 更新时间:2026-05-29 13:20:00",
            },
          ],
        };
      }
      return { code: 0, data: { items: [] } };
    };

    const context = await buildCampusContextForDorm("南区21号楼", { transport });

    expect(context.all_machines.map((machine) => machine.status)).toEqual(["available", "out_of_service"]);
  });
});
