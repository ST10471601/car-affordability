import type { FinanceRules } from "./finance-rules";
import { basisPoints } from "./money";
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
