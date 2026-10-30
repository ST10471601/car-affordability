import { describe, expect, it } from "vitest";
import {
  annualToMonthlyCents,
  applyBasisPoints,
  basisPoints,
  basisPointsToRate,
  cents,
  randsToCents,
  ratioInBasisPointsRoundedDown,
  ratioInBasisPointsRoundedUp,
  roundToCents,
} from "./money";

const nonFinite = [
  Number.NaN,
  Number.POSITIVE_INFINITY,
  Number.NEGATIVE_INFINITY,
];

describe("cents", () => {
  it.each([0, 1, -1, 123_456_789])("accepts the integer %s", (value) => {
    expect(cents(value)).toBe(value);
  });

  it.each([0.5, -1.25, Number.MAX_SAFE_INTEGER + 1, ...nonFinite])(
    "rejects %s",
    (value) => {
      expect(() => cents(value)).toThrow(RangeError);
    },
  );
});

describe("basisPoints", () => {
  it.each([0, 1, 1_250, 10_000])("accepts the integer %s", (value) => {
    expect(basisPoints(value)).toBe(value);
  });

  it.each([12.5, -0.1, Number.MAX_SAFE_INTEGER + 1, ...nonFinite])(
    "rejects %s",
    (value) => {
      expect(() => basisPoints(value)).toThrow(RangeError);
    },
  );
});

describe("roundToCents", () => {
  it.each([
    { input: 1_234.4, expected: 1_234 },
    { input: 1_234.5, expected: 1_235 },
    { input: 1_234.6, expected: 1_235 },
    { input: 0.5, expected: 1 },
    { input: 2.5, expected: 3 },
    { input: -0.5, expected: -1 },
    { input: -2.5, expected: -3 },
    { input: -1_234.4, expected: -1_234 },
    { input: -1_234.5, expected: -1_235 },
    { input: -1_234.6, expected: -1_235 },
    { input: 42, expected: 42 },
    { input: 0, expected: 0 },
    { input: -0, expected: 0 },
    { input: -0.4, expected: 0 },
  ])(
    "rounds $input half away from zero to $expected",
    ({ input, expected }) => {
      expect(roundToCents(input)).toBe(expected);
    },
  );

  it.each(nonFinite)("rejects %s", (value) => {
    expect(() => roundToCents(value)).toThrow(RangeError);
  });
});

describe("randsToCents", () => {
  it.each([
    { rands: 300_000, expected: 30_000_000 },
    { rands: 1_207.5, expected: 120_750 },
    { rands: 69, expected: 6_900 },
    { rands: 0.29, expected: 29 },
    { rands: 1.1, expected: 110 },
    { rands: 19.99, expected: 1_999 },
    { rands: -12.34, expected: -1_234 },
    { rands: 0.125, expected: 13 },
    { rands: -0.125, expected: -13 },
    { rands: 0.004, expected: 0 },
    { rands: -0.004, expected: 0 },
    { rands: 0, expected: 0 },
  ])("converts R$rands to $expected cents", ({ rands, expected }) => {
    expect(randsToCents(rands)).toBe(expected);
  });

  it.each(nonFinite)("rejects %s", (value) => {
    expect(() => randsToCents(value)).toThrow(RangeError);
  });
});

describe("annualToMonthlyCents", () => {
  it.each([
    { annual: 120_000, expected: 10_000 },
    { annual: 100, expected: 8 },
    { annual: 6, expected: 1 },
    { annual: 18, expected: 2 },
    { annual: 30, expected: 3 },
    { annual: -6, expected: -1 },
    { annual: -30, expected: -3 },
    { annual: -4, expected: 0 },
    { annual: 0, expected: 0 },
  ])(
    "converts $annual annual cents to $expected monthly cents",
    ({ annual, expected }) => {
      expect(annualToMonthlyCents(cents(annual))).toBe(expected);
    },
  );
});

describe("basisPointsToRate", () => {
  it.each([
    { bps: 0, expected: 0 },
    { bps: 1_250, expected: 0.125 },
    { bps: 10_000, expected: 1 },
  ])("converts $bps basis points to $expected", ({ bps, expected }) => {
    expect(basisPointsToRate(basisPoints(bps))).toBe(expected);
  });
});

describe("applyBasisPoints", () => {
  it.each([
    { amount: 30_000_000, bps: 2_500, expected: 7_500_000 },
    { amount: 5_000, bps: 1, expected: 0.5 },
    { amount: 1, bps: 5_000, expected: 0.5 },
    { amount: 333, bps: 3_333, expected: 110.9889 },
    { amount: 30_000_000, bps: 0, expected: 0 },
  ])(
    "applies $bps basis points to $amount exactly",
    ({ amount, bps, expected }) => {
      expect(applyBasisPoints(amount, basisPoints(bps))).toBe(expected);
    },
  );
});

describe("ratioInBasisPointsRoundedUp", () => {
  it.each([
    { part: 199_900, whole: 1_000_000, expected: 1_999 },
    { part: 59_999, whole: 300_000, expected: 2_000 },
    { part: 60_001, whole: 300_000, expected: 2_001 },
    { part: 1_000_000, whole: 1_000_000, expected: 10_000 },
    { part: 0, whole: 300_000, expected: 0 },
    { part: -1, whole: 300_000, expected: 0 },
    { part: -300_000, whole: 1_000_000, expected: -3_000 },
  ])(
    "expresses $part of $whole as $expected basis points",
    ({ part, whole, expected }) => {
      expect(ratioInBasisPointsRoundedUp(cents(part), cents(whole))).toBe(
        expected,
      );
    },
  );

  it("rejects a zero whole", () => {
    expect(() => ratioInBasisPointsRoundedUp(cents(1), cents(0))).toThrow(
      RangeError,
    );
  });
});

describe("ratioInBasisPointsRoundedDown", () => {
  it.each([
    { part: 149_900, whole: 1_000_000, expected: 1_499 },
    { part: 44_999, whole: 300_000, expected: 1_499 },
    { part: 45_001, whole: 300_000, expected: 1_500 },
    { part: 1_000_000, whole: 1_000_000, expected: 10_000 },
    { part: 0, whole: 300_000, expected: 0 },
    { part: -1, whole: 300_000, expected: -1 },
    { part: -300_000, whole: 1_000_000, expected: -3_000 },
  ])(
    "expresses $part of $whole as $expected basis points",
    ({ part, whole, expected }) => {
      expect(ratioInBasisPointsRoundedDown(cents(part), cents(whole))).toBe(
        expected,
      );
    },
  );

  it("rejects a zero whole", () => {
    expect(() => ratioInBasisPointsRoundedDown(cents(1), cents(0))).toThrow(
      RangeError,
    );
  });
});
