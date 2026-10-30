import { describe, expect, it } from "vitest";
import {
  affordabilityValues,
  assessmentContext,
  buildAffordabilityInput,
  cashPurchase,
  financedPurchase,
  type AffordabilityValues,
} from "../affordability.fixtures";
import { assessAffordability } from "../assessment";
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

describe("findMaxAffordablePrice", () => {
  it("finds the highest comfortable financed price to the nearest R1,000", () => {
    expect(findMax({})).toBe(16_800_000);
  });

  it("finds the highest comfortable cash price to the nearest R1,000", () => {
    expect(findMax({ purchase: cashPurchase })).toBe(119_600_000);
  });

  it("looks past low candidates whose balloon would exceed the principal", () => {
    const lowCandidate = buildAffordabilityInput({
      ...depositAndBalloon,
      vehicle: { ...affordabilityValues.vehicle, priceCents: 12_000_000 },
    });
    expect(
      assessAffordability(lowCandidate, assessmentContext).breakdown.finance
        ?.validation.errors,
    ).toEqual([
      {
        code: "BALLOON_EXCEEDS_PRINCIPAL",
        balloonCents: 3_000_000,
        principalCents: 2_120_750,
      },
    ]);

    expect(findMax(depositAndBalloon)).toBe(28_200_000);
  });

  it("is zero when a balloon is not allowed at any price", () => {
    expect(
      findMax({
        vehicle: { ...affordabilityValues.vehicle, modelYear: 2020 },
        purchase: { ...financedPurchase, balloonBps: 2_500 },
      }),
    ).toBe(0);
  });

  it("is zero when the deposit covers every comfortable price", () => {
    expect(
      findMax({ purchase: { ...financedPurchase, depositCents: 150_000_000 } }),
    ).toBe(0);
  });

  it("is zero when expenses already exceed income", () => {
    expect(
      findMax({
        expenses: [
          {
            category: "rentOrBond",
            amount: { amountCents: 4_500_000, frequency: "monthly" },
          },
        ],
      }),
    ).toBe(0);
  });

  it("is capped at the upper bound", () => {
    expect(
      findMax({
        income: {
          earners: [{ amountCents: 100_000_000, frequency: "monthly" }],
        },
        purchase: cashPurchase,
      }),
    ).toBe(500_000_000);
  });

  it("rounds an upper bound that is not a whole R1,000 down", () => {
    expect(findMax({ purchase: cashPurchase }, cents(10_050_000))).toBe(
      10_000_000,
    );
  });
});
