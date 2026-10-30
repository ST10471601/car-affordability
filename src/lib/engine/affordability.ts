import type { z } from "zod";
import {
  calculateCarCost,
  determineVerdictForCarCost,
  type AffordabilityAssessment,
  type AffordabilityBreakdown,
  type CarCost,
  type FinanceBreakdown,
} from "./assessment";
import type { FinanceError, FinanceRules } from "./finance-rules";
import {
  findMaxAffordablePrice,
  type MaxAffordablePrice,
} from "./max-price/find-max-affordable-price";
import type { Cents } from "./money";
import {
  affordabilityInputSchema,
  runningCostRatesSchema,
  verdictThresholdsSchema,
} from "./schemas";

export type AffordabilityConfig = {
  readonly financeRules: FinanceRules;
  readonly maxPriceUpperBoundCents: Cents;
};

export type ValidDealResult = AffordabilityAssessment & {
  ok: true;
  maxAffordablePrice: MaxAffordablePrice;
};

export type InvalidFinanceResult = {
  ok: false;
  reason: "INVALID_FINANCE";
  errors: FinanceError[];
  breakdown: AffordabilityBreakdown & { finance: FinanceBreakdown };
};

export type AffordabilityResult = ValidDealResult | InvalidFinanceResult;

function invalidFinanceResult({
  breakdown,
}: CarCost): InvalidFinanceResult | null {
  const { finance, runningCosts } = breakdown;
  if (finance === null || finance.validation.errors.length === 0) {
    return null;
  }
  return {
    ok: false,
    reason: "INVALID_FINANCE",
    errors: finance.validation.errors,
    breakdown: { finance, runningCosts },
  };
}

export function evaluateAffordability(
  input: z.input<typeof affordabilityInputSchema>,
  rates: z.input<typeof runningCostRatesSchema>,
  thresholds: z.input<typeof verdictThresholdsSchema>,
  { financeRules, maxPriceUpperBoundCents }: AffordabilityConfig,
): AffordabilityResult {
  const parsedInput = affordabilityInputSchema.parse(input);
  const context = {
    rates: runningCostRatesSchema.parse(rates),
    thresholds: verdictThresholdsSchema.parse(thresholds),
    financeRules,
  };

  const carCost = calculateCarCost(parsedInput, context);
  const invalidFinance = invalidFinanceResult(carCost);
  if (invalidFinance !== null) {
    return invalidFinance;
  }

  return {
    ok: true,
    ...carCost,
    verdict: determineVerdictForCarCost(
      parsedInput,
      carCost,
      context.thresholds,
    ),
    maxAffordablePrice: findMaxAffordablePrice(
      parsedInput,
      context,
      maxPriceUpperBoundCents,
    ),
  };
}
