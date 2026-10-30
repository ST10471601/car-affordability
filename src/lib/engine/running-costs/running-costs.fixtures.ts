import { cents } from "../money";
import type {
  Powertrain,
  Region,
  RunningCostInput,
  RunningCostRates,
  ServicePlan,
} from "../schemas";

export const runningCostRates: RunningCostRates = {
  fuelPriceCentsPerLitre: {
    inland: { petrol: cents(2_200), diesel: cents(2_000) },
    coastal: { petrol: cents(2_100), diesel: cents(1_900) },
  },
  electricityTariffCentsPerKwh: cents(350),
  consumptionUpliftByPowertrain: {
    petrol: 0.15,
    diesel: 0.1,
    hybrid: 0.25,
    plugInHybrid: 0.5,
    electric: 0.2,
  },
  insuranceAnnualRateOfValue: 0.04,
  maintenanceCentsPerKmByAgeBand: [
    { maxAgeYears: 3, centsPerKm: cents(40) },
    { maxAgeYears: 6, centsPerKm: cents(70) },
    { maxAgeYears: null, centsPerKm: cents(110) },
  ],
  tyreSetCents: cents(800_000),
  tyreLifeKm: 40_000,
  licenceAnnualCents: cents(60_000),
  effectiveFrom: "2026-10-01",
};

export type RunningCostScenario = {
  powertrain?: Powertrain;
  claimedConsumption?: number;
  region?: Region;
  vehicleValueCents?: number;
  vehicleAgeYearsAtPurchase?: number;
  kmPerMonth?: number;
  ownershipMonths?: number;
  servicePlan?: ServicePlan | null;
  insuranceMonthlyOverrideCents?: number;
};

export function buildRunningCostInput({
  powertrain = "petrol",
  claimedConsumption = 7,
  region = "inland",
  vehicleValueCents = 30_000_000,
  vehicleAgeYearsAtPurchase = 0,
  kmPerMonth = 1_500,
  ownershipMonths = 72,
  servicePlan = null,
  insuranceMonthlyOverrideCents,
}: RunningCostScenario): RunningCostInput {
  return {
    powertrain,
    claimedConsumption,
    region,
    vehicleValueCents: cents(vehicleValueCents),
    vehicleAgeYearsAtPurchase,
    kmPerMonth,
    ownershipMonths,
    servicePlan,
    ...(insuranceMonthlyOverrideCents !== undefined && {
      insuranceMonthlyOverrideCents: cents(insuranceMonthlyOverrideCents),
    }),
  };
}
