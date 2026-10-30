import { describe, expect, it } from "vitest";
import { cents } from "../money";
import type { ServicePlan } from "../schemas";
import {
  calculateMaintenanceForMonth,
  calculateServicePlanEndMonth,
} from "./maintenance";
import {
  buildRunningCostInput,
  runningCostRates,
  type RunningCostScenario,
} from "./running-costs.fixtures";

const endMonthCases: {
  name: string;
  servicePlan: ServicePlan | null;
  kmPerMonth: number;
  expected: number | null;
}[] = [
  {
    name: "is null without a service plan",
    servicePlan: null,
    kmPerMonth: 1_500,
    expected: null,
  },
  {
    name: "is the last remaining month when the term runs out first",
    servicePlan: { remainingMonths: 24, remainingKm: 100_000 },
    kmPerMonth: 1_500,
    expected: 24,
  },
  {
    name: "is the month the distance runs out when it runs out first",
    servicePlan: { remainingMonths: 60, remainingKm: 45_000 },
    kmPerMonth: 1_500,
    expected: 30,
  },
  {
    name: "includes a month that starts with distance remaining",
    servicePlan: { remainingMonths: 60, remainingKm: 46_000 },
    kmPerMonth: 1_500,
    expected: 31,
  },
  {
    name: "is zero when the term has already expired",
    servicePlan: { remainingMonths: 0, remainingKm: 20_000 },
    kmPerMonth: 1_500,
    expected: 0,
  },
  {
    name: "is zero when the distance has already run out",
    servicePlan: { remainingMonths: 12, remainingKm: 0 },
    kmPerMonth: 1_500,
    expected: 0,
  },
  {
    name: "is the last remaining month when the vehicle is not driven",
    servicePlan: { remainingMonths: 24, remainingKm: 30_000 },
    kmPerMonth: 0,
    expected: 24,
  },
  {
    name: "is zero when the vehicle is not driven but no distance remains",
    servicePlan: { remainingMonths: 24, remainingKm: 0 },
    kmPerMonth: 0,
    expected: 0,
  },
];

const monthCases: {
  name: string;
  scenario: RunningCostScenario;
  ownershipMonth: number;
  expected: number;
}[] = [
  {
    name: "charges an uncovered month at the rate for the vehicle's age",
    scenario: {},
    ownershipMonth: 1,
    expected: 60_000,
  },
  {
    name: "charges nothing in the last month the service plan covers",
    scenario: { servicePlan: { remainingMonths: 12, remainingKm: 50_000 } },
    ownershipMonth: 12,
    expected: 0,
  },
  {
    name: "charges the first month after the service plan ends",
    scenario: { servicePlan: { remainingMonths: 12, remainingKm: 50_000 } },
    ownershipMonth: 13,
    expected: 60_000,
  },
  {
    name: "charges every month once the service plan has expired",
    scenario: {
      vehicleAgeYearsAtPurchase: 5,
      servicePlan: { remainingMonths: 0, remainingKm: 20_000 },
    },
    ownershipMonth: 1,
    expected: 105_000,
  },
  {
    name: "keeps a vehicle at a band's maximum age in that band",
    scenario: { vehicleAgeYearsAtPurchase: 3 },
    ownershipMonth: 12,
    expected: 60_000,
  },
  {
    name: "moves to the next band once a year of ownership passes",
    scenario: { vehicleAgeYearsAtPurchase: 3 },
    ownershipMonth: 13,
    expected: 105_000,
  },
  {
    name: "uses the open-ended band beyond the last maximum age",
    scenario: { vehicleAgeYearsAtPurchase: 6 },
    ownershipMonth: 13,
    expected: 165_000,
  },
  {
    name: "charges nothing when the vehicle is not driven",
    scenario: { kmPerMonth: 0, vehicleAgeYearsAtPurchase: 10 },
    ownershipMonth: 1,
    expected: 0,
  },
];

describe("calculateServicePlanEndMonth", () => {
  it.each(endMonthCases)("$name", ({ servicePlan, kmPerMonth, expected }) => {
    expect(calculateServicePlanEndMonth(servicePlan, kmPerMonth)).toBe(
      expected,
    );
  });
});

describe("calculateMaintenanceForMonth", () => {
  it.each(monthCases)("$name", ({ scenario, ownershipMonth, expected }) => {
    expect(
      calculateMaintenanceForMonth(
        buildRunningCostInput(scenario),
        runningCostRates,
        ownershipMonth,
      ),
    ).toBe(expected);
  });

  it("uses the age bands from the supplied rates", () => {
    expect(
      calculateMaintenanceForMonth(
        buildRunningCostInput({ vehicleAgeYearsAtPurchase: 3 }),
        {
          ...runningCostRates,
          maintenanceCentsPerKmByAgeBand: [
            { maxAgeYears: null, centsPerKm: cents(80) },
          ],
        },
        13,
      ),
    ).toBe(120_000);
  });
});
