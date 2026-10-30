import { describe, expect, it } from "vitest";
import { ZodError } from "zod";
import {
  affordabilityValues,
  affordabilityValuesWith,
  assessmentContext,
  cashPurchase,
  financedPurchase,
  verdictThresholds,
  type AffordabilityValues,
} from "./affordability.fixtures";
import {
  DEFAULT_AFFORDABILITY_CONFIG,
  DEFAULT_VERDICT_THRESHOLDS,
  evaluateAffordability,
} from "./index";
import { cents } from "./money";
import { runningCostRates } from "./running-costs/running-costs.fixtures";

const config = {
  financeRules: assessmentContext.financeRules,
  maxPriceUpperBoundCents: cents(500_000_000),
};

function evaluate(overrides: Partial<AffordabilityValues>) {
  return evaluateAffordability(
    affordabilityValuesWith(overrides),
    runningCostRates,
    verdictThresholds,
    config,
  );
}

function evaluateAtPrice(
  overrides: Partial<AffordabilityValues>,
  priceCents: number,
) {
  return evaluate({
    ...overrides,
    vehicle: { ...affordabilityValues.vehicle, priceCents },
  });
}

const rentAboveIncome = [
  {
    category: "rentOrBond",
    amount: { amountCents: 4_500_000, frequency: "monthly" },
  },
] satisfies AffordabilityValues["expenses"];

describe("evaluateAffordability", () => {
  it("returns the car cost, its breakdown, the verdict and the max price", () => {
    expect(evaluate({})).toMatchObject({
      monthlyCarCostCents: 1_104_278,
      breakdown: {
        finance: { monthlyInstalmentCents: 603_628 },
        runningCosts: { totalMonthlyAverageCents: 500_650 },
      },
      verdict: { status: "stretched", reasons: ["CAR_COST_SHARE_HIGH"] },
      maxAffordablePriceCents: 16_800_000,
    });
  });

  it("gives the same result with the engine defaults", () => {
    expect(
      evaluateAffordability(
        affordabilityValues,
        runningCostRates,
        DEFAULT_VERDICT_THRESHOLDS,
        DEFAULT_AFFORDABILITY_CONFIG,
      ),
    ).toEqual(evaluate({}));
  });

  it("finds a cash purchase comfortable where finance is stretched", () => {
    expect(evaluate({ purchase: cashPurchase })).toMatchObject({
      monthlyCarCostCents: 500_650,
      breakdown: { finance: null },
      verdict: { status: "comfortable", reasons: [] },
      maxAffordablePriceCents: 119_600_000,
    });
  });

  it.each([
    { name: "a financed purchase", overrides: {} },
    { name: "a cash purchase", overrides: { purchase: cashPurchase } },
    {
      name: "a deposit with a balloon",
      overrides: {
        purchase: {
          ...financedPurchase,
          depositCents: 10_000_000,
          balloonBps: 2_500,
        },
      },
    },
  ])(
    "returns a max price for $name that is comfortable but not R1,000 more",
    ({ overrides }) => {
      const { maxAffordablePriceCents } = evaluate(overrides);
      const atMax = evaluateAtPrice(overrides, maxAffordablePriceCents);
      const aboveMax = evaluateAtPrice(
        overrides,
        maxAffordablePriceCents + 100_000,
      );

      expect(maxAffordablePriceCents).toBeGreaterThan(0);
      expect(atMax.verdict.status).toBe("comfortable");
      expect(atMax.breakdown.finance?.validation.errors ?? []).toEqual([]);
      expect(aboveMax.verdict.status).not.toBe("comfortable");
    },
  );

  it("is unaffordable with a max price of 0 when expenses exceed income", () => {
    expect(
      evaluate({ expenses: rentAboveIncome, purchase: cashPurchase }),
    ).toMatchObject({
      verdict: {
        status: "unaffordable",
        checks: {
          carCostShare: { status: "comfortable", valueBps: 1_252 },
          buffer: { status: "unaffordable", valueBps: -2_502 },
        },
        reasons: ["BUFFER_LOW"],
      },
      maxAffordablePriceCents: 0,
    });
  });

  it("uses the supplied thresholds", () => {
    expect(
      evaluateAffordability(
        affordabilityValues,
        runningCostRates,
        {
          ...verdictThresholds,
          carCostShare: {
            comfortableBelowBps: 3_000,
            unaffordableAboveBps: 4_000,
          },
        },
        config,
      ).verdict.status,
    ).toBe("comfortable");
  });

  it("searches no higher than the configured upper bound", () => {
    expect(
      evaluateAffordability(
        affordabilityValuesWith({ purchase: cashPurchase }),
        runningCostRates,
        verdictThresholds,
        { ...config, maxPriceUpperBoundCents: cents(10_000_000) },
      ).maxAffordablePriceCents,
    ).toBe(10_000_000);
  });

  it.each([
    { name: "no income", amountCents: 0 },
    { name: "an income just below R1,000 a month", amountCents: 99_999 },
  ])("rejects $name", ({ amountCents }) => {
    expect(() =>
      evaluate({
        income: { earners: [{ amountCents, frequency: "monthly" }] },
      }),
    ).toThrow(/Net monthly income must be at least R1,000\./);
  });

  it("rejects thresholds in the wrong order", () => {
    expect(() =>
      evaluateAffordability(
        affordabilityValues,
        runningCostRates,
        {
          ...verdictThresholds,
          buffer: { comfortableFromBps: 400, unaffordableBelowBps: 500 },
        },
        config,
      ),
    ).toThrow(/comfortable buffer limit cannot be below the unaffordable/);
  });

  it("rejects invalid running cost rates", () => {
    expect(() =>
      evaluateAffordability(
        affordabilityValues,
        { ...runningCostRates, tyreLifeKm: 0 },
        verdictThresholds,
        config,
      ),
    ).toThrow(ZodError);
  });
});
