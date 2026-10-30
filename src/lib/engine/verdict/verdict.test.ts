import { describe, expect, it } from "vitest";
import { basisPoints, cents } from "../money";
import type { VerdictThresholds } from "../schemas";
import { determineVerdict, type VerdictCheck } from "./verdict";

const thresholds: VerdictThresholds = {
  carCostShare: {
    comfortableBelowBps: basisPoints(2_000),
    unaffordableAboveBps: basisPoints(3_000),
  },
  buffer: {
    comfortableFromBps: basisPoints(1_500),
    unaffordableBelowBps: basisPoints(500),
  },
};

function verdictFor({
  carCostCents,
  expensesCents = 0,
  netIncomeCents = 1_000_000,
}: {
  carCostCents: number;
  expensesCents?: number;
  netIncomeCents?: number;
}) {
  return determineVerdict(
    {
      netIncomeCents: cents(netIncomeCents),
      expensesCents: cents(expensesCents),
      carCostCents: cents(carCostCents),
    },
    thresholds,
  );
}

describe("determineVerdict", () => {
  describe("car cost share", () => {
    it.each<{ carCostCents: number; expected: VerdictCheck }>([
      {
        carCostCents: 199_900,
        expected: { status: "comfortable", valueBps: basisPoints(1_999) },
      },
      {
        carCostCents: 200_000,
        expected: { status: "stretched", valueBps: basisPoints(2_000) },
      },
      {
        carCostCents: 300_000,
        expected: { status: "stretched", valueBps: basisPoints(3_000) },
      },
      {
        carCostCents: 300_100,
        expected: { status: "unaffordable", valueBps: basisPoints(3_001) },
      },
    ])(
      "rates a share of $expected.valueBps basis points as $expected.status",
      ({ carCostCents, expected }) => {
        expect(verdictFor({ carCostCents }).checks.carCostShare).toEqual(
          expected,
        );
      },
    );

    it("rounds a fractional share up", () => {
      expect(
        verdictFor({ carCostCents: 59_999, netIncomeCents: 300_000 }).checks
          .carCostShare,
      ).toEqual({ status: "stretched", valueBps: 2_000 });
    });
  });

  describe("buffer", () => {
    it.each<{ expensesCents: number; expected: VerdictCheck }>([
      {
        expensesCents: 750_000,
        expected: { status: "comfortable", valueBps: basisPoints(1_500) },
      },
      {
        expensesCents: 750_100,
        expected: { status: "stretched", valueBps: basisPoints(1_499) },
      },
      {
        expensesCents: 850_000,
        expected: { status: "stretched", valueBps: basisPoints(500) },
      },
      {
        expensesCents: 850_100,
        expected: { status: "unaffordable", valueBps: basisPoints(499) },
      },
    ])(
      "rates a buffer of $expected.valueBps basis points as $expected.status",
      ({ expensesCents, expected }) => {
        expect(
          verdictFor({ carCostCents: 100_000, expensesCents }).checks.buffer,
        ).toEqual(expected);
      },
    );

    it("rounds a fractional buffer down", () => {
      expect(
        verdictFor({
          carCostCents: 30_000,
          expensesCents: 225_001,
          netIncomeCents: 300_000,
        }).checks.buffer,
      ).toEqual({ status: "stretched", valueBps: 1_499 });
    });

    it("reports a negative buffer when costs exceed income", () => {
      expect(
        verdictFor({ carCostCents: 100_000, expensesCents: 1_200_000 }).checks
          .buffer,
      ).toEqual({ status: "unaffordable", valueBps: -3_000 });
    });

    it("rounds a fractional negative buffer down", () => {
      expect(
        verdictFor({
          carCostCents: 30_000,
          expensesCents: 270_001,
          netIncomeCents: 300_000,
        }).checks.buffer,
      ).toEqual({ status: "unaffordable", valueBps: -1 });
    });
  });

  describe("overall status", () => {
    it("is comfortable without reasons when both checks are comfortable", () => {
      expect(verdictFor({ carCostCents: 100_000 })).toEqual({
        status: "comfortable",
        checks: {
          carCostShare: { status: "comfortable", valueBps: 1_000 },
          buffer: { status: "comfortable", valueBps: 9_000 },
        },
        reasons: [],
      });
    });

    it("is unaffordable when only the buffer is unaffordable", () => {
      expect(
        verdictFor({ carCostCents: 100_000, expensesCents: 900_000 }),
      ).toEqual({
        status: "unaffordable",
        checks: {
          carCostShare: { status: "comfortable", valueBps: 1_000 },
          buffer: { status: "unaffordable", valueBps: 0 },
        },
        reasons: ["BUFFER_LOW"],
      });
    });

    it("is unaffordable when only the car cost share is unaffordable", () => {
      expect(verdictFor({ carCostCents: 350_000 })).toEqual({
        status: "unaffordable",
        checks: {
          carCostShare: { status: "unaffordable", valueBps: 3_500 },
          buffer: { status: "comfortable", valueBps: 6_500 },
        },
        reasons: ["CAR_COST_SHARE_HIGH"],
      });
    });

    it("is stretched with both reasons when both checks are stretched", () => {
      expect(
        verdictFor({ carCostCents: 250_000, expensesCents: 650_000 }),
      ).toEqual({
        status: "stretched",
        checks: {
          carCostShare: { status: "stretched", valueBps: 2_500 },
          buffer: { status: "stretched", valueBps: 1_000 },
        },
        reasons: ["CAR_COST_SHARE_HIGH", "BUFFER_LOW"],
      });
    });

    it("takes the worse status when the checks disagree", () => {
      expect(
        verdictFor({ carCostCents: 250_000, expensesCents: 720_000 }),
      ).toMatchObject({
        status: "unaffordable",
        reasons: ["CAR_COST_SHARE_HIGH", "BUFFER_LOW"],
      });
    });
  });

  it("uses the supplied thresholds", () => {
    expect(
      determineVerdict(
        {
          netIncomeCents: cents(1_000_000),
          expensesCents: cents(0),
          carCostCents: cents(250_000),
        },
        {
          ...thresholds,
          carCostShare: {
            comfortableBelowBps: basisPoints(3_000),
            unaffordableAboveBps: basisPoints(4_000),
          },
        },
      ).status,
    ).toBe("comfortable");
  });
});
