import type { FinanceRules } from "./finance-rules";
import { basisPoints } from "./money";

export const DEFAULT_FINANCE_RULES: FinanceRules = Object.freeze({
  maxBalloonVehicleAgeYears: 4,
  balloonWarningBps: basisPoints(3_000),
});
