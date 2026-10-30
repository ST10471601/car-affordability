import { calculateMonthlyExpenses, calculateNetMonthlyIncome } from "./budget";
import {
  calculateFinance,
  type FinanceInput,
  type FinanceResult,
} from "./finance";
import {
  validateFinance,
  type FinanceRules,
  type FinanceValidation,
} from "./finance-rules";
import { cents, type Cents } from "./money";
import {
  summariseRunningCosts,
  type RunningCostsResult,
} from "./running-costs/running-costs";
import type {
  AffordabilityInput,
  AffordabilityPurchase,
  RunningCostInput,
  RunningCostRates,
  VerdictThresholds,
} from "./schemas";
import { determineVerdict, type Verdict } from "./verdict/verdict";

export type AssessmentContext = {
  rates: RunningCostRates;
  thresholds: VerdictThresholds;
  financeRules: FinanceRules;
};

export type FinanceBreakdown = FinanceResult & {
  validation: FinanceValidation;
};

export type AffordabilityBreakdown = {
  finance: FinanceBreakdown | null;
  runningCosts: RunningCostsResult;
};

export type CarCost = {
  monthlyCarCostCents: Cents;
  breakdown: AffordabilityBreakdown;
};

export type AffordabilityAssessment = CarCost & {
  verdict: Verdict;
};

function toFinanceInput({
  vehicle,
  purchase,
  tradeIn,
}: AffordabilityInput): FinanceInput | null {
  return purchase.method === "finance"
    ? { vehicle, purchase, tradeIn, fees: purchase.fees }
    : null;
}

function ownershipMonths(purchase: AffordabilityPurchase): number {
  return purchase.method === "finance"
    ? purchase.termMonths
    : purchase.ownershipMonths;
}

function toRunningCostInput({
  vehicle,
  purchase,
  usage,
  currentYear,
}: AffordabilityInput): RunningCostInput {
  return {
    ...usage,
    vehicleValueCents: vehicle.priceCents,
    vehicleAgeYearsAtPurchase: Math.max(0, currentYear - vehicle.modelYear),
    ownershipMonths: ownershipMonths(purchase),
  };
}

function assessFinance(
  input: AffordabilityInput,
  financeRules: FinanceRules,
): FinanceBreakdown | null {
  const financeInput = toFinanceInput(input);
  if (financeInput === null) {
    return null;
  }
  return {
    ...calculateFinance(financeInput),
    validation: validateFinance(financeInput, financeRules, input.currentYear),
  };
}

export function calculateCarCost(
  input: AffordabilityInput,
  { rates, financeRules }: Pick<AssessmentContext, "rates" | "financeRules">,
): CarCost {
  const finance = assessFinance(input, financeRules);
  const runningCosts = summariseRunningCosts(toRunningCostInput(input), rates);
  return {
    monthlyCarCostCents: cents(
      (finance?.monthlyInstalmentCents ?? 0) +
        runningCosts.totalMonthlyAverageCents,
    ),
    breakdown: { finance, runningCosts },
  };
}

export function determineVerdictForCarCost(
  input: AffordabilityInput,
  { monthlyCarCostCents }: CarCost,
  thresholds: VerdictThresholds,
): Verdict {
  return determineVerdict(
    {
      netIncomeCents: calculateNetMonthlyIncome(input.income),
      expensesCents: calculateMonthlyExpenses(input.expenses),
      carCostCents: monthlyCarCostCents,
    },
    thresholds,
  );
}

export function assessAffordability(
  input: AffordabilityInput,
  context: AssessmentContext,
): AffordabilityAssessment {
  const carCost = calculateCarCost(input, context);
  return {
    ...carCost,
    verdict: determineVerdictForCarCost(input, carCost, context.thresholds),
  };
}
