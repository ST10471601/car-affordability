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
  type AffordabilityResult,
  type ValidDealResult,
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

function validDeal(result: AffordabilityResult): ValidDealResult {
  if (!result.ok) {
    const codes = result.errors.map(({ code }) => code).join(", ");
    throw new Error(`Expected a valid deal, but finance failed: ${codes}.`);
  }
  return result;
}

function evaluateValidAtPrice(
  overrides: Partial<AffordabilityValues>,
  priceCents: number,
) {
  return validDeal(
    evaluate({
      ...overrides,
      vehicle: { ...affordabilityValues.vehicle, priceCents },
    }),
  );
}

const olderVehicle = {
  vehicle: { ...affordabilityValues.vehicle, modelYear: 2020 },
};

const rentAboveIncome = [
  {
    category: "rentOrBond",
    amount: { amountCents: 4_500_000, frequency: "monthly" },
  },
] satisfies AffordabilityValues["expenses"];

describe("evaluateAffordability", () => {
  describe("for a valid deal", () => {
    it("returns the car cost, its breakdown, the verdict and the max price", () => {
      expect(evaluate({})).toMatchObject({
        ok: true,
        monthlyCarCostCents: 1_104_278,
        breakdown: {
          finance: { monthlyInstalmentCents: 603_628 },
          runningCosts: { totalMonthlyAverageCents: 500_650 },
        },
        verdict: { status: "stretched", reasons: ["CAR_COST_SHARE_HIGH"] },
        maxAffordablePrice: { priceCents: 16_800_000, limitedBy: "BUDGET" },
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
        ok: true,
        monthlyCarCostCents: 500_650,
        breakdown: { finance: null },
        verdict: { status: "comfortable", reasons: [] },
        maxAffordablePrice: { priceCents: 119_600_000, limitedBy: "BUDGET" },
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
        const { priceCents } = validDeal(
          evaluate(overrides),
        ).maxAffordablePrice;
        const atMax = evaluateValidAtPrice(overrides, priceCents);
        const aboveMax = evaluateValidAtPrice(overrides, priceCents + 100_000);

        expect(priceCents).toBeGreaterThan(0);
        expect(atMax.verdict.status).toBe("comfortable");
        expect(aboveMax.verdict.status).not.toBe("comfortable");
      },
    );

    it("limits the max price to the configured upper bound", () => {
      expect(
        validDeal(
          evaluateAffordability(
            affordabilityValuesWith({ purchase: cashPurchase }),
            runningCostRates,
            verdictThresholds,
            { ...config, maxPriceUpperBoundCents: cents(10_000_000) },
          ),
        ).maxAffordablePrice,
      ).toEqual({ priceCents: 10_000_000, limitedBy: "UPPER_BOUND" });
    });

    it("is unaffordable with a max price of 0 when expenses exceed income", () => {
      expect(
        evaluate({ expenses: rentAboveIncome, purchase: cashPurchase }),
      ).toMatchObject({
        ok: true,
        verdict: {
          status: "unaffordable",
          checks: {
            carCostShare: { status: "comfortable", valueBps: 1_252 },
            buffer: { status: "unaffordable", valueBps: -2_502 },
          },
          reasons: ["BUFFER_LOW"],
        },
        maxAffordablePrice: {
          priceCents: 0,
          limitedBy: "EXPENSES_EXCEED_INCOME",
        },
      });
    });

    it("explains a max price of 0 caused by the finance rules", () => {
      expect(
        evaluate({
          vehicle: { ...affordabilityValues.vehicle, priceCents: 160_000_000 },
          purchase: { ...financedPurchase, depositCents: 150_000_000 },
        }),
      ).toMatchObject({
        ok: true,
        verdict: { status: "stretched" },
        maxAffordablePrice: {
          priceCents: 0,
          limitedBy: "FINANCE_RULES",
          blockingErrorCodes: ["NOTHING_TO_FINANCE"],
        },
      });
    });

    it("keeps finance warnings on the breakdown without blocking", () => {
      const result = validDeal(
        evaluate({ purchase: { ...financedPurchase, balloonBps: 3_500 } }),
      );
      expect(result.breakdown.finance?.validation).toEqual({
        errors: [],
        warnings: [
          { code: "HIGH_BALLOON", balloonBps: 3_500, balloonWarningBps: 3_000 },
        ],
      });
      expect(result.verdict.status).toBe("stretched");
    });

    it("uses the supplied thresholds", () => {
      expect(
        validDeal(
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
          ),
        ).verdict.status,
      ).toBe("comfortable");
    });
  });

  describe("for a deal the finance rules reject at the entered price", () => {
    it("returns the errors and breakdown without a verdict or max price", () => {
      const result = evaluate({
        ...olderVehicle,
        purchase: { ...financedPurchase, balloonBps: 2_500 },
      });
      const ageError = {
        code: "BALLOON_NOT_ALLOWED_FOR_AGE",
        vehicleAgeYears: 6,
        maxBalloonVehicleAgeYears: 4,
      };

      expect(result).toMatchObject({
        ok: false,
        reason: "INVALID_FINANCE",
        errors: [ageError],
        breakdown: {
          finance: {
            principalCents: 30_120_750,
            balloonCents: 7_500_000,
            validation: { errors: [ageError], warnings: [] },
          },
          runningCosts: {
            maintenanceMonthlyAverageCents: 155_000,
            totalMonthlyAverageCents: 555_650,
          },
        },
      });
      expect(Object.keys(result)).toEqual([
        "ok",
        "reason",
        "errors",
        "breakdown",
      ]);
    });

    it("rejects a deposit that covers the price", () => {
      expect(
        evaluate({
          purchase: { ...financedPurchase, depositCents: 40_000_000 },
        }),
      ).toMatchObject({
        ok: false,
        reason: "INVALID_FINANCE",
        errors: [{ code: "NOTHING_TO_FINANCE", principalCents: -9_879_250 }],
      });
    });

    it("reports every error and keeps the warnings", () => {
      expect(
        evaluate({
          ...olderVehicle,
          purchase: {
            ...financedPurchase,
            depositCents: 40_000_000,
            balloonBps: 3_500,
          },
        }),
      ).toMatchObject({
        ok: false,
        errors: [
          { code: "NOTHING_TO_FINANCE", principalCents: -9_879_250 },
          {
            code: "BALLOON_EXCEEDS_PRINCIPAL",
            balloonCents: 10_500_000,
            principalCents: -9_879_250,
          },
          {
            code: "BALLOON_NOT_ALLOWED_FOR_AGE",
            vehicleAgeYears: 6,
            maxBalloonVehicleAgeYears: 4,
          },
        ],
        breakdown: {
          finance: {
            validation: {
              warnings: [
                {
                  code: "HIGH_BALLOON",
                  balloonBps: 3_500,
                  balloonWarningBps: 3_000,
                },
              ],
            },
          },
        },
      });
    });
  });

  describe("input validation", () => {
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
});
