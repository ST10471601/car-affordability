import { describe, expect, it } from "vitest";
import { basisPoints } from "../money";
import { calculateMonthlyFuel } from "./fuel";
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
    name: "petrol is priced at the inland petrol price with its uplift",
    scenario: {},
    expected: 265_650,
  },
  {
    name: "petrol is priced at the coastal petrol price at the coast",
    scenario: { region: "coastal" },
    expected: 253_575,
  },
  {
    name: "diesel is priced at the inland diesel price with its uplift",
    scenario: { powertrain: "diesel", claimedConsumption: 6.5 },
    expected: 214_500,
  },
  {
    name: "diesel is priced at the coastal diesel price at the coast",
    scenario: {
      powertrain: "diesel",
      claimedConsumption: 6.5,
      region: "coastal",
    },
    expected: 203_775,
  },
  {
    name: "a hybrid is priced as petrol with the hybrid uplift",
    scenario: { powertrain: "hybrid", claimedConsumption: 4.4 },
    expected: 181_500,
  },
  {
    name: "a plug-in hybrid is priced as petrol with its own uplift",
    scenario: {
      powertrain: "plugInHybrid",
      claimedConsumption: 2,
      region: "coastal",
    },
    expected: 94_500,
  },
  {
    name: "an electric vehicle is priced at the electricity tariff",
    scenario: { powertrain: "electric", claimedConsumption: 16 },
    expected: 100_800,
  },
  {
    name: "an electric vehicle pays the same tariff at the coast",
    scenario: {
      powertrain: "electric",
      claimedConsumption: 16,
      region: "coastal",
    },
    expected: 100_800,
  },
  {
    name: "a fractional cost below half a cent rounds down",
    scenario: { kmPerMonth: 1_234 },
    expected: 218_541,
  },
  {
    name: "a fractional cost above half a cent rounds up",
    scenario: { kmPerMonth: 1_236 },
    expected: 218_896,
  },
  {
    name: "no distance costs nothing",
    scenario: { kmPerMonth: 0 },
    expected: 0,
  },
];

describe("calculateMonthlyFuel", () => {
  it.each(cases)("$name", ({ scenario, expected }) => {
    expect(
      calculateMonthlyFuel(buildRunningCostInput(scenario), runningCostRates),
    ).toBe(expected);
  });

  it("uses the uplift from the supplied rates", () => {
    const rates = {
      ...runningCostRates,
      consumptionUpliftBpsByPowertrain: {
        ...runningCostRates.consumptionUpliftBpsByPowertrain,
        petrol: basisPoints(0),
      },
    };
    expect(calculateMonthlyFuel(buildRunningCostInput({}), rates)).toBe(
      231_000,
    );
  });
});
