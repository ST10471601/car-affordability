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

export type AffordabilityAssessment = {
  monthlyCarCostCents: Cents;
  breakdown: {
    finance: FinanceBreakdown | null;
    runningCosts: RunningCostsResult;
  };
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

export function assessAffordability(
  input: AffordabilityInput,
  { rates, thresholds, financeRules }: AssessmentContext,
): AffordabilityAssessment {
  const finance = assessFinance(input, financeRules);
  const runningCosts = summariseRunningCosts(toRunningCostInput(input), rates);
  const monthlyCarCostCents = cents(
    (finance?.monthlyInstalmentCents ?? 0) +
      runningCosts.totalMonthlyAverageCents,
  );

  return {
    monthlyCarCostCents,
    breakdown: { finance, runningCosts },
    verdict: determineVerdict(
      {
        netIncomeCents: calculateNetMonthlyIncome(input.income),
        expensesCents: calculateMonthlyExpenses(input.expenses),
        carCostCents: monthlyCarCostCents,
      },
      thresholds,
    ),
  };
}
