import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import { calculateRunningCosts } from "./index";
import {
  buildRunningCostInput,
  runningCostRates,
  type RunningCostScenario,
} from "./running-costs.fixtures";

function calculate(scenario: RunningCostScenario) {
  return calculateRunningCosts(
    buildRunningCostInput(scenario),
    runningCostRates,
  );
}

const maintenanceCases: {
  name: string;
  scenario: RunningCostScenario;
  expected: {
    maintenanceMonthlyAverageCents: number;
    servicePlanEndsAtMonth: number | null;
  };
}[] = [
  {
    name: "charges every month without a service plan",
    scenario: {},
    expected: {
      maintenanceMonthlyAverageCents: 75_000,
      servicePlanEndsAtMonth: null,
    },
  },
  {
    name: "charges from the month after the service plan term ends",
    scenario: { servicePlan: { remainingMonths: 24, remainingKm: 100_000 } },
    expected: {
      maintenanceMonthlyAverageCents: 55_000,
      servicePlanEndsAtMonth: 24,
    },
  },
  {
    name: "charges from the month after the service plan distance runs out",
    scenario: { servicePlan: { remainingMonths: 60, remainingKm: 45_000 } },
    expected: {
      maintenanceMonthlyAverageCents: 50_000,
      servicePlanEndsAtMonth: 30,
    },
  },
  {
    name: "charges every month for a used car whose plan term has expired",
    scenario: {
      vehicleAgeYearsAtPurchase: 5,
      servicePlan: { remainingMonths: 0, remainingKm: 20_000 },
    },
    expected: {
      maintenanceMonthlyAverageCents: 145_000,
      servicePlanEndsAtMonth: 0,
    },
  },
  {
    name: "charges every month for a used car whose plan distance has run out",
    scenario: {
      vehicleAgeYearsAtPurchase: 5,
      servicePlan: { remainingMonths: 12, remainingKm: 0 },
    },
    expected: {
      maintenanceMonthlyAverageCents: 145_000,
      servicePlanEndsAtMonth: 0,
    },
  },
  {
    name: "charges nothing when the service plan outlasts ownership",
    scenario: {
      ownershipMonths: 36,
      servicePlan: { remainingMonths: 60, remainingKm: 150_000 },
    },
    expected: { maintenanceMonthlyAverageCents: 0, servicePlanEndsAtMonth: 60 },
  },
  {
    name: "rounds the average of the uncovered months over ownership",
    scenario: {
      ownershipMonths: 7,
      servicePlan: { remainingMonths: 12, remainingKm: 4_000 },
    },
    expected: {
      maintenanceMonthlyAverageCents: 34_286,
      servicePlanEndsAtMonth: 3,
    },
  },
  {
    name: "moves to a dearer band when the vehicle ages past a band's limit",
    scenario: { vehicleAgeYearsAtPurchase: 3, ownershipMonths: 24 },
    expected: {
      maintenanceMonthlyAverageCents: 82_500,
      servicePlanEndsAtMonth: null,
    },
  },
  {
    name: "moves into the open-ended band partway through ownership",
    scenario: { vehicleAgeYearsAtPurchase: 5, ownershipMonths: 36 },
    expected: {
      maintenanceMonthlyAverageCents: 125_000,
      servicePlanEndsAtMonth: null,
    },
  },
  {
    name: "weights each band by the months spent in it",
    scenario: { vehicleAgeYearsAtPurchase: 3, ownershipMonths: 18 },
    expected: {
      maintenanceMonthlyAverageCents: 75_000,
      servicePlanEndsAtMonth: null,
    },
  },
];

const scenarios: { name: string; scenario: RunningCostScenario }[] = [
  { name: "a new petrol car", scenario: {} },
  {
    name: "a coastal diesel",
    scenario: {
      powertrain: "diesel",
      claimedConsumption: 6.5,
      region: "coastal",
    },
  },
  {
    name: "a hybrid",
    scenario: { powertrain: "hybrid", claimedConsumption: 4.4 },
  },
  {
    name: "a plug-in hybrid",
    scenario: { powertrain: "plugInHybrid", claimedConsumption: 2 },
  },
  {
    name: "an electric vehicle",
    scenario: { powertrain: "electric", claimedConsumption: 16 },
  },
  {
    name: "an undriven car with an exhausted service plan",
    scenario: {
      kmPerMonth: 0,
      servicePlan: { remainingMonths: 0, remainingKm: 0 },
    },
  },
  {
    name: "fractional components over a short ownership",
    scenario: {
      kmPerMonth: 1_234,
      vehicleValueCents: 12_345_678,
      ownershipMonths: 7,
    },
  },
  {
    name: "an old car kept for the maximum period",
    scenario: {
      vehicleAgeYearsAtPurchase: 9,
      ownershipMonths: 240,
      insuranceMonthlyOverrideCents: 0,
      servicePlan: { remainingMonths: 12, remainingKm: 4_000 },
    },
  },
];

describe("calculateRunningCosts", () => {
  it("averages every component over the ownership period", () => {
    expect(calculate({})).toEqual({
      fuelMonthlyAverageCents: 265_650,
      insuranceMonthlyAverageCents: 100_000,
      maintenanceMonthlyAverageCents: 75_000,
      tyresMonthlyAverageCents: 30_000,
      licenceMonthlyAverageCents: 5_000,
      totalMonthlyAverageCents: 475_650,
      servicePlanEndsAtMonth: null,
    });
  });

  it("combines electricity, an insurance override and a service plan", () => {
    expect(
      calculate({
        powertrain: "electric",
        claimedConsumption: 16,
        insuranceMonthlyOverrideCents: 85_000,
        servicePlan: { remainingMonths: 24, remainingKm: 100_000 },
      }),
    ).toEqual({
      fuelMonthlyAverageCents: 100_800,
      insuranceMonthlyAverageCents: 85_000,
      maintenanceMonthlyAverageCents: 55_000,
      tyresMonthlyAverageCents: 30_000,
      licenceMonthlyAverageCents: 5_000,
      totalMonthlyAverageCents: 275_800,
      servicePlanEndsAtMonth: 24,
    });
  });

  it("charges only fixed costs when the vehicle is not driven", () => {
    expect(
      calculate({
        kmPerMonth: 0,
        servicePlan: { remainingMonths: 24, remainingKm: 30_000 },
      }),
    ).toEqual({
      fuelMonthlyAverageCents: 0,
      insuranceMonthlyAverageCents: 100_000,
      maintenanceMonthlyAverageCents: 0,
      tyresMonthlyAverageCents: 0,
      licenceMonthlyAverageCents: 5_000,
      totalMonthlyAverageCents: 105_000,
      servicePlanEndsAtMonth: 24,
    });
  });

  describe("maintenance", () => {
    it.each(maintenanceCases)("$name", ({ scenario, expected }) => {
      expect(calculate(scenario)).toMatchObject(expected);
    });
  });

  it.each(scenarios)(
    "reports non-negative whole numbers for $name",
    ({ scenario }) => {
      const { servicePlanEndsAtMonth, ...amounts } = calculate(scenario);
      const values = [
        ...Object.values(amounts),
        ...(servicePlanEndsAtMonth === null ? [] : [servicePlanEndsAtMonth]),
      ];

      for (const value of values) {
        expect(Number.isSafeInteger(value)).toBe(true);
        expect(value).toBeGreaterThanOrEqual(0);
      }
    },
  );

  it.each(scenarios)(
    "reconciles the total with its components for $name",
    ({ scenario }) => {
      const {
        fuelMonthlyAverageCents,
        insuranceMonthlyAverageCents,
        maintenanceMonthlyAverageCents,
        tyresMonthlyAverageCents,
        licenceMonthlyAverageCents,
        totalMonthlyAverageCents,
      } = calculate(scenario);

      expect(
        fuelMonthlyAverageCents +
          insuranceMonthlyAverageCents +
          maintenanceMonthlyAverageCents +
          tyresMonthlyAverageCents +
          licenceMonthlyAverageCents,
      ).toBe(totalMonthlyAverageCents);
    },
  );

  it("accepts rates parsed from JSON", () => {
    expect(
      calculateRunningCosts(
        buildRunningCostInput({}),
        JSON.parse(JSON.stringify(runningCostRates)),
      ),
    ).toEqual(calculate({}));
  });

  it("rejects input that fails the input schema", () => {
    expect(() =>
      calculateRunningCosts(
        { ...buildRunningCostInput({}), kmPerMonth: -1 },
        runningCostRates,
      ),
    ).toThrow(ZodError);
  });

  it("rejects rates that fail the rates schema", () => {
    expect(() =>
      calculateRunningCosts(buildRunningCostInput({}), {
        ...runningCostRates,
        maintenanceCentsPerKmByAgeBand: [{ maxAgeYears: 3, centsPerKm: 40 }],
      }),
    ).toThrow(ZodError);
  });
});
