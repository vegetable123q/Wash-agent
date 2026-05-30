import { describe, expect, it } from "vitest";
import { machinePriceText, machineProgramOptions } from "./machinePricing";
import type { BackendMachine } from "./types";

describe("machinePricing", () => {
  it("formats list price from supported machine modes", () => {
    const machine: BackendMachine = {
      machine_id: "washer-1",
      location: "1F",
      machine_type: "standard_washer",
      status: "available",
      remaining_minutes: null,
      price_yuan: null,
      modes: ["standard"],
    };

    const priceText = machinePriceText(machine, {
      wash_programs: {
        quick: { price_yuan: 3, duration_minutes: 30 },
        standard: { price_yuan: 3.5, duration_minutes: 40 },
        large: { price_yuan: 4, duration_minutes: 50 },
      },
      dryer_programs: {},
    });

    expect(priceText).toContain("3.5");
    expect(priceText).not.toContain("3-4");
  });

  it("falls back to configured prices when direct machine price is invalid", () => {
    const machine: BackendMachine = {
      machine_id: "washer-1",
      location: "1F",
      machine_type: "standard_washer",
      status: "available",
      remaining_minutes: null,
      price_yuan: Number.NaN,
      modes: ["standard"],
    };

    const priceText = machinePriceText(machine, {
      wash_programs: {
        standard: { price_yuan: 3.5, duration_minutes: 40 },
      },
      dryer_programs: {},
    });

    expect(priceText).toContain("3.5");
    expect(priceText).not.toContain("NaN");
  });

  it("falls back to configured prices when direct machine price is negative", () => {
    const machine: BackendMachine = {
      machine_id: "washer-1",
      location: "1F",
      machine_type: "standard_washer",
      status: "available",
      remaining_minutes: null,
      price_yuan: -1,
      modes: ["standard"],
    };

    const priceText = machinePriceText(machine, {
      wash_programs: {
        standard: { price_yuan: 3.5, duration_minutes: 40 },
      },
      dryer_programs: {},
    });

    expect(priceText).toContain("3.5");
    expect(priceText).not.toContain("-1");
  });

  it("ignores negative configured prices in price ranges", () => {
    const machine: BackendMachine = {
      machine_id: "washer-1",
      location: "1F",
      machine_type: "standard_washer",
      status: "available",
      remaining_minutes: null,
      price_yuan: null,
      modes: [],
    };

    const priceText = machinePriceText(machine, {
      wash_programs: {
        quick: { price_yuan: -1, duration_minutes: 30 },
        standard: { price_yuan: 3.5, duration_minutes: 40 },
      },
      dryer_programs: {},
    });

    expect(priceText).toContain("3.5");
    expect(priceText).not.toContain("-1");
  });

  it("ignores configured programs with invalid durations", () => {
    const machine: BackendMachine = {
      machine_id: "washer-1",
      location: "1F",
      machine_type: "standard_washer",
      status: "available",
      remaining_minutes: null,
      price_yuan: null,
      modes: [],
    };

    const options = machineProgramOptions(machine, {
      wash_programs: {
        quick: { price_yuan: 3, duration_minutes: 1.5 },
        standard: { price_yuan: 3.5, duration_minutes: 40 },
      },
      dryer_programs: {},
    });

    expect(options.map((option) => option.id)).toEqual(["standard"]);
    expect(JSON.stringify(options)).not.toContain("1.5");
  });
});
