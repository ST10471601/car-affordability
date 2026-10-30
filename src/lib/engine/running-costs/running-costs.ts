import type { z } from "zod";
import { cents, roundToCents, type Cents } from "../money";
import {
  runningCostInputSchema,
  runningCostRatesSchema,
  type RunningCostInput,
  type RunningCostRates,
} from "../schemas";
import { calculateMonthlyFuel } from "./fuel";
import { calculateMonthlyInsurance } from "./insurance";
import { calculateMonthlyLicence } from "./licence";
import {
  calculateMaintenanceForMonth,
  calculateServicePlanEndMonth,
} from "./maintenance";
import { calculateMonthlyTyres } from "./tyres";

export type RunningCostsResult = {
  fuelMonthlyAverageCents: Cents;
  insuranceMonthlyAverageCents: Cents;
  maintenanceMonthlyAverageCents: Cents;
  tyresMonthlyAverageCents: Cents;
  licenceMonthlyAverageCents: Cents;
  totalMonthlyAverageCents: Cents;
  servicePlanEndsAtMonth: number | null;
};

type MonthlyRunningCosts = {
  fuel: Cents;
  insurance: Cents;
  maintenance: Cents;
  tyres: Cents;
  licence: Cents;
};

function projectMonth(
  input: RunningCostInput,
  rates: RunningCostRates,
  ownershipMonth: number,
): MonthlyRunningCosts {
  return {
    fuel: calculateMonthlyFuel(input, rates),
    insurance: calculateMonthlyInsurance(input, rates),
    maintenance: calculateMaintenanceForMonth(input, rates, ownershipMonth),
    tyres: calculateMonthlyTyres(input, rates),
    licence: calculateMonthlyLicence(rates),
  };
}

function projectOwnership(
  input: RunningCostInput,
  rates: RunningCostRates,
): MonthlyRunningCosts[] {
  return Array.from({ length: input.ownershipMonths }, (_, index) =>
    projectMonth(input, rates, index + 1),
  );
}

function averageOf(
  months: readonly MonthlyRunningCosts[],
  component: keyof MonthlyRunningCosts,
): Cents {
  const total = months.reduce((sum, month) => sum + month[component], 0);
  return roundToCents(total / months.length);
}

function summariseRunningCosts(
  input: RunningCostInput,
  rates: RunningCostRates,
): RunningCostsResult {
  const months = projectOwnership(input, rates);
  const fuel = averageOf(months, "fuel");
  const insurance = averageOf(months, "insurance");
  const maintenance = averageOf(months, "maintenance");
  const tyres = averageOf(months, "tyres");
  const licence = averageOf(months, "licence");

  return {
    fuelMonthlyAverageCents: fuel,
    insuranceMonthlyAverageCents: insurance,
    maintenanceMonthlyAverageCents: maintenance,
    tyresMonthlyAverageCents: tyres,
    licenceMonthlyAverageCents: licence,
    totalMonthlyAverageCents: cents(
      fuel + insurance + maintenance + tyres + licence,
    ),
    servicePlanEndsAtMonth: calculateServicePlanEndMonth(
      input.servicePlan,
      input.kmPerMonth,
    ),
  };
}

export function calculateRunningCosts(
  input: z.input<typeof runningCostInputSchema>,
  rates: z.input<typeof runningCostRatesSchema>,
): RunningCostsResult {
  return summariseRunningCosts(
    runningCostInputSchema.parse(input),
    runningCostRatesSchema.parse(rates),
  );
}
