import type { AffordabilityConfig } from "./affordability";
import type { FinanceRules } from "./finance-rules";
import { basisPoints, cents } from "./money";
import type { VerdictThresholds } from "./schemas";

export const DEFAULT_FINANCE_RULES: FinanceRules = Object.freeze({
  maxBalloonVehicleAgeYears: 4,
  balloonWarningBps: basisPoints(3_000),
});

export const DEFAULT_VERDICT_THRESHOLDS: VerdictThresholds = Object.freeze({
  carCostShare: Object.freeze({
    comfortableBelowBps: basisPoints(2_000),
    unaffordableAboveBps: basisPoints(3_000),
  }),
  buffer: Object.freeze({
    comfortableFromBps: basisPoints(1_500),
    unaffordableBelowBps: basisPoints(500),
  }),
});

export const DEFAULT_AFFORDABILITY_CONFIG: AffordabilityConfig = Object.freeze({
  financeRules: DEFAULT_FINANCE_RULES,
  maxPriceUpperBoundCents: cents(500_000_000),
});
