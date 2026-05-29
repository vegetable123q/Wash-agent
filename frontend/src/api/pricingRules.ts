/**
 * Embedded machine rules and pricing configuration.
 * Mirrors config/machine_rules.json so the APK is self-contained.
 */

import type { PricingRules } from "./types";

export const PRICING_RULES: PricingRules = {
  wash_programs: {
    standard: { price_yuan: 4.0, duration_minutes: 35 },
    large: { price_yuan: 6.0, duration_minutes: 45 },
    gentle: { price_yuan: 4.0, duration_minutes: 30 },
  },
  dryer_programs: {
    low: { price_yuan: 2.0, duration_minutes: 25 },
  },
  washer_types: {
    standard_washer: { capacity_kg: 7.0, default_price_yuan: 3.0, modes: ["quick", "standard", "heavy"] },
    shoe_washer: {},
  },
  dryer_modes: {
    "30min": { duration_minutes: 30, price_yuan: 3.0 },
    "60min": { duration_minutes: 60, price_yuan: 5.0 },
    "90min": { duration_minutes: 90, price_yuan: 7.0 },
  },
};

export const DRYING_CONTEXT: Record<string, unknown> = {
  balcony_available: true,
  ventilation: "normal",
};

export const MACHINE_TYPE_MAP: Record<string, string> = {
  洗衣机: "standard_washer",
  洗鞋机: "shoe_washer",
  烘干机: "dryer",
};

