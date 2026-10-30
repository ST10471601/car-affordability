import { describe, expect, it } from "vitest";
import { calculateMonthlyInsurance } from "./insurance";
import {
  buildRunningCostInput,
  runningCostRates,
  type RunningCostScenario,
} from "./running-costs.fixtures";

const cases: {
  name: string;
  scenario: RunningCostScenario;
  expected: number;
}[] = [
  {
    name: "estimates a twelfth of the annual rate of the vehicle value",
    scenario: {},
    expected: 100_000,
  },
  {
    name: "rounds a fractional estimate below half a cent down",
    scenario: { vehicleValueCents: 12_345_678 },
    expected: 41_152,
  },
  {
    name: "rounds a fractional estimate above half a cent up",
    scenario: { vehicleValueCents: 30_000_200 },
    expected: 100_001,
  },
  {
    name: "uses the override instead of the estimate",
    scenario: { insuranceMonthlyOverrideCents: 85_000 },
    expected: 85_000,
  },
  {
    name: "uses a zero override instead of the estimate",
    scenario: { insuranceMonthlyOverrideCents: 0 },
    expected: 0,
  },
];

describe("calculateMonthlyInsurance", () => {
  it.each(cases)("$name", ({ scenario, expected }) => {
    expect(
      calculateMonthlyInsurance(
        buildRunningCostInput(scenario),
        runningCostRates,
      ),
    ).toBe(expected);
  });

  it("uses the annual rate from the supplied rates", () => {
    expect(
      calculateMonthlyInsurance(buildRunningCostInput({}), {
        ...runningCostRates,
        insuranceAnnualRateOfValue: 0.06,
      }),
    ).toBe(150_000);
  });
});
