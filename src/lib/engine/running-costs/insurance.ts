import {
  basisPointsToRate,
  MONTHS_PER_YEAR,
  roundToCents,
  type Cents,
} from "../money";
import type { RunningCostInput, RunningCostRates } from "../schemas";

function estimateMonthlyPremium(
  { vehicleValueCents }: RunningCostInput,
  { insuranceAnnualRateBps }: RunningCostRates,
): Cents {
  return roundToCents(
    (vehicleValueCents * basisPointsToRate(insuranceAnnualRateBps)) /
      MONTHS_PER_YEAR,
  );
}

export function calculateMonthlyInsurance(
  input: RunningCostInput,
  rates: RunningCostRates,
): Cents {
  return (
    input.insuranceMonthlyOverrideCents ?? estimateMonthlyPremium(input, rates)
  );
}
