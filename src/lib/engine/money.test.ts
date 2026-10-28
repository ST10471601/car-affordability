import { describe, expect, it } from "vitest";
import {
  annualToMonthlyCents,
  basisPoints,
  cents,
  randsToCents,
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
