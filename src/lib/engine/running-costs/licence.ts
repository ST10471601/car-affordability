import { annualToMonthlyCents, type Cents } from "../money";
import type { RunningCostRates } from "../schemas";

export function calculateMonthlyLicence({
  licenceAnnualCents,
}: RunningCostRates): Cents {
  return annualToMonthlyCents(licenceAnnualCents);
}
