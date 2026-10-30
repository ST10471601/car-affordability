import { cents, MONTHS_PER_YEAR, roundToCents, type Cents } from "../money";
import type {
  MaintenanceAgeBand,
  RunningCostInput,
  RunningCostRates,
  ServicePlan,
} from "../schemas";

function monthsCoveredByDistance(
  remainingKm: number,
  kmPerMonth: number,
): number {
  if (kmPerMonth === 0) {
    return remainingKm > 0 ? Number.POSITIVE_INFINITY : 0;
  }
  return Math.ceil(remainingKm / kmPerMonth);
}

export function calculateServicePlanEndMonth(
  servicePlan: ServicePlan | null,
  kmPerMonth: number,
): number | null {
  if (servicePlan === null) {
    return null;
  }
  return Math.min(
    servicePlan.remainingMonths,
    monthsCoveredByDistance(servicePlan.remainingKm, kmPerMonth),
  );
}

function isCoveredByServicePlan(
  { servicePlan, kmPerMonth }: RunningCostInput,
  ownershipMonth: number,
): boolean {
  const endMonth = calculateServicePlanEndMonth(servicePlan, kmPerMonth);
  return endMonth !== null && ownershipMonth <= endMonth;
}

function vehicleAgeYearsInMonth(
  { vehicleAgeYearsAtPurchase }: RunningCostInput,
  ownershipMonth: number,
): number {
  return (
    vehicleAgeYearsAtPurchase +
    Math.floor((ownershipMonth - 1) / MONTHS_PER_YEAR)
  );
}

function centsPerKmForAge(
  bands: readonly MaintenanceAgeBand[],
  ageYears: number,
): Cents {
  const band = bands.find(
    ({ maxAgeYears }) => maxAgeYears === null || ageYears <= maxAgeYears,
  );
  if (band === undefined) {
    throw new RangeError(
      `No maintenance age band covers a vehicle aged ${ageYears} years.`,
    );
  }
  return band.centsPerKm;
}

export function calculateMaintenanceForMonth(
  input: RunningCostInput,
  rates: RunningCostRates,
  ownershipMonth: number,
): Cents {
  if (isCoveredByServicePlan(input, ownershipMonth)) {
    return cents(0);
  }
  const centsPerKm = centsPerKmForAge(
    rates.maintenanceCentsPerKmByAgeBand,
    vehicleAgeYearsInMonth(input, ownershipMonth),
  );
  return roundToCents(input.kmPerMonth * centsPerKm);
}
