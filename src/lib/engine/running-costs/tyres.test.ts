import { describe, expect, it } from "vitest";
import {
  buildRunningCostInput,
  runningCostRates,
} from "./running-costs.fixtures";
import { calculateMonthlyTyres } from "./tyres";

describe("calculateMonthlyTyres", () => {
  it.each([
    {
      name: "spreads a tyre set over its life at the monthly distance",
      kmPerMonth: 1_500,
      tyreLifeKm: 40_000,
      expected: 30_000,
    },
    {
      name: "rounds a fractional cost below half a cent down",
      kmPerMonth: 1_500,
      tyreLifeKm: 42_000,
      expected: 28_571,
    },
    {
      name: "rounds a fractional cost above half a cent up",
      kmPerMonth: 1_500,
      tyreLifeKm: 45_000,
      expected: 26_667,
    },
    {
      name: "charges nothing when the vehicle is not driven",
      kmPerMonth: 0,
      tyreLifeKm: 40_000,
      expected: 0,
    },
  ])("$name", ({ kmPerMonth, tyreLifeKm, expected }) => {
    expect(
      calculateMonthlyTyres(buildRunningCostInput({ kmPerMonth }), {
        ...runningCostRates,
        tyreLifeKm,
      }),
    ).toBe(expected);
  });
});
