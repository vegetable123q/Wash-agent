/**
 * Embedded machine rules and pricing configuration.
 * Mirrors config/machine_rules.json so the APK is self-contained.
 */

import type { PricingRules } from "./types";

export const PRICING_RULES: PricingRules = {
  wash_programs: {
    quick: { price_yuan: 3.0, duration_minutes: 30 },
    standard: { price_yuan: 3.5, duration_minutes: 40 },
    large: { price_yuan: 4.0, duration_minutes: 50 },
  },
  dryer_programs: {
    high: { price_yuan: 4.0, duration_minutes: 90 },
    medium: { price_yuan: 3.0, duration_minutes: 60 },
    low: { price_yuan: 2.0, duration_minutes: 50 },
  },
  shoe_washer_programs: {
    two_pairs: { price_yuan: 4.0, duration_minutes: 35 },
    single_pair_standard: { price_yuan: 3.0, duration_minutes: 31 },
    single_pair: { price_yuan: 2.5, duration_minutes: 29 },
  },
  provider_programs: {
    haier: {
      wash_programs: {
        quick: { label: "快速", price_yuan: 3.0, duration_minutes: 30 },
        standard: { label: "标准", price_yuan: 3.5, duration_minutes: 40 },
        large: { label: "大物", price_yuan: 4.0, duration_minutes: 50 },
        spin: { label: "单脱", price_yuan: 1.5, duration_minutes: 6 },
        tub_clean: { label: "桶自洁", price_yuan: 0.0, duration_minutes: 6 },
        standard_40c: { label: "标准+40度", price_yuan: 4.5, duration_minutes: 60 },
        standard_60c_uv: { label: "标准+60度+紫外", price_yuan: 5.0, duration_minutes: 70 },
      },
      dryer_programs: {
        high: { label: "高温", price_yuan: 4.0, duration_minutes: 90 },
        medium: { label: "中温", price_yuan: 3.0, duration_minutes: 60 },
        low: { label: "低温", price_yuan: 2.0, duration_minutes: 50 },
      },
      shoe_washer_programs: {
        two_pairs: { label: "两双洗", price_yuan: 4.0, duration_minutes: 35 },
        single_pair_standard: { label: "单双标准", price_yuan: 3.0, duration_minutes: 31 },
        single_pair: { label: "单双洗", price_yuan: 2.5, duration_minutes: 29 },
        spin: { label: "单脱", price_yuan: 1.0, duration_minutes: 7 },
        tub_clean: { label: "桶清洁", price_yuan: 0.0, duration_minutes: 2 },
      },
    },
    cleverschool: {
      wash_programs: {
        quick: { label: "快速洗", price_yuan: 3.0, duration_minutes: 30 },
        standard: { label: "标准洗", price_yuan: 3.5, duration_minutes: 40 },
        large: { label: "大件洗", price_yuan: 4.0, duration_minutes: 50 },
      },
      dryer_programs: {
        strong: { label: "强力烘", price_yuan: 4.0, duration_minutes: 90 },
        standard: { label: "标准烘", price_yuan: 3.0, duration_minutes: 60 },
        gentle: { label: "轻柔烘", price_yuan: 2.0, duration_minutes: 50 },
        air: { label: "晾干烘", price_yuan: 2.0, duration_minutes: 50 },
      },
      shoe_washer_programs: {
        two_pairs: { label: "两双洗", price_yuan: 4.0, duration_minutes: 35 },
        single_pair_standard: { label: "单双标准", price_yuan: 3.0, duration_minutes: 31 },
        single_pair: { label: "单双洗", price_yuan: 2.5, duration_minutes: 29 },
      },
    },
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

