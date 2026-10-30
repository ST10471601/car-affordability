import type { z } from "zod";
import {
  assessAffordability,
  type AffordabilityAssessment,
} from "./assessment";
import type { FinanceRules } from "./finance-rules";
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

export type AffordabilityResult = AffordabilityAssessment & {
  maxAffordablePrice: MaxAffordablePrice;
};

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

  return {
    ...assessAffordability(parsedInput, context),
    maxAffordablePrice: findMaxAffordablePrice(
      parsedInput,
      context,
      maxPriceUpperBoundCents,
    ),
  };
}
