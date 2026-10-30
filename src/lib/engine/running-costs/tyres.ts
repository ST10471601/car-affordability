import { roundToCents, type Cents } from "../money";
import type { RunningCostInput, RunningCostRates } from "../schemas";

export function calculateMonthlyTyres(
  { kmPerMonth }: RunningCostInput,
  { tyreSetCents, tyreLifeKm }: RunningCostRates,
): Cents {
  return roundToCents((tyreSetCents * kmPerMonth) / tyreLifeKm);
}
