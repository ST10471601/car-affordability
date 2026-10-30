import { describe, expect, it } from "vitest";
import {
  affordabilityValues,
  assessmentContext,
  buildAffordabilityInput,
  cashPurchase,
  financedPurchase,
  type AffordabilityValues,
} from "../affordability.fixtures";
import { calculateCarCost } from "../assessment";
import { cents } from "../money";
import { findMaxAffordablePrice } from "./find-max-affordable-price";

const UPPER_BOUND_CENTS = cents(500_000_000);

function findMax(
  overrides: Partial<AffordabilityValues>,
  upperBoundCents = UPPER_BOUND_CENTS,
) {
  return findMaxAffordablePrice(
    buildAffordabilityInput(overrides),
    assessmentContext,
    upperBoundCents,
  );
}

const depositAndBalloon = {
  purchase: {
    ...financedPurchase,
    depositCents: 10_000_000,
    balloonBps: 2_500,
  },
};

const olderVehicle = {
  vehicle: { ...affordabilityValues.vehicle, modelYear: 2020 },
};

describe("findMaxAffordablePrice", () => {
  describe("limited by the budget", () => {
    it("finds the highest comfortable financed price to the nearest R1,000", () => {
      expect(findMax({})).toEqual({
        priceCents: 16_800_000,
        limitedBy: "BUDGET",
      });
    });

    it("finds the highest comfortable cash price to the nearest R1,000", () => {
      expect(findMax({ purchase: cashPurchase })).toEqual({
        priceCents: 119_600_000,
        limitedBy: "BUDGET",
      });
    });

    it("looks past low candidates whose balloon would exceed the principal", () => {
      const lowCandidate = buildAffordabilityInput({
        ...depositAndBalloon,
        vehicle: { ...affordabilityValues.vehicle, priceCents: 12_000_000 },
      });
      expect(
        calculateCarCost(lowCandidate, assessmentContext).breakdown.finance
          ?.validation.errors,
      ).toEqual([
        {
          code: "BALLOON_EXCEEDS_PRINCIPAL",
          balloonCents: 3_000_000,
          principalCents: 2_120_750,
        },
      ]);

      expect(findMax(depositAndBalloon)).toEqual({
        priceCents: 28_200_000,
        limitedBy: "BUDGET",
      });
    });
  });

  describe("limited by the upper bound", () => {
    it("returns the upper bound when it is still comfortable", () => {
      expect(
        findMax({
          income: {
            earners: [{ amountCents: 100_000_000, frequency: "monthly" }],
          },
          purchase: cashPurchase,
        }),
      ).toEqual({ priceCents: 500_000_000, limitedBy: "UPPER_BOUND" });
    });

    it("rounds an upper bound that is not a whole R1,000 down", () => {
      expect(findMax({ purchase: cashPurchase }, cents(10_050_000))).toEqual({
        priceCents: 10_000_000,
        limitedBy: "UPPER_BOUND",
      });
    });
  });

  describe("limited by expenses exceeding income", () => {
    it("is zero when not even a price of zero is comfortable", () => {
      expect(
        findMax({
          expenses: [
            {
              category: "rentOrBond",
              amount: { amountCents: 4_500_000, frequency: "monthly" },
            },
          ],
        }),
      ).toEqual({ priceCents: 0, limitedBy: "EXPENSES_EXCEED_INCOME" });
    });
  });

  describe("limited by the finance rules", () => {
    it("is zero with the blocking code when a balloon is never allowed", () => {
      expect(
        findMax({
          ...olderVehicle,
          purchase: { ...financedPurchase, balloonBps: 2_500 },
        }),
      ).toEqual({
        priceCents: 0,
        limitedBy: "FINANCE_RULES",
        blockingErrorCodes: ["BALLOON_NOT_ALLOWED_FOR_AGE"],
      });
    });

    it("is zero when the deposit covers every comfortable price", () => {
      expect(
        findMax({
          purchase: { ...financedPurchase, depositCents: 150_000_000 },
        }),
      ).toEqual({
        priceCents: 0,
        limitedBy: "FINANCE_RULES",
        blockingErrorCodes: ["NOTHING_TO_FINANCE"],
      });
    });

    it("reports every rule the highest comfortable price breaks", () => {
      expect(
        findMax({
          ...olderVehicle,
          purchase: {
            ...financedPurchase,
            depositCents: 150_000_000,
            balloonBps: 2_500,
          },
        }),
      ).toEqual({
        priceCents: 0,
        limitedBy: "FINANCE_RULES",
        blockingErrorCodes: [
          "BALLOON_EXCEEDS_PRINCIPAL",
          "BALLOON_NOT_ALLOWED_FOR_AGE",
        ],
      });
    });
  });
});
