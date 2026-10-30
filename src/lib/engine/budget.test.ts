import { describe, expect, it } from "vitest";
import {
  calculateMonthlyExpenses,
  calculateNetMonthlyIncome,
  toMonthlyCents,
} from "./budget";
import { cents } from "./money";
import type { Expense, Frequency } from "./schemas";

function amount(amountCents: number, frequency: Frequency) {
  return { amountCents: cents(amountCents), frequency };
}

describe("toMonthlyCents", () => {
  it.each([
    { amountCents: 2_500_000, frequency: "monthly", expected: 2_500_000 },
    { amountCents: 1_200_000, frequency: "annual", expected: 100_000 },
    { amountCents: 100, frequency: "annual", expected: 8 },
  ] as const)(
    "converts $amountCents $frequency cents to $expected monthly cents",
    ({ amountCents, frequency, expected }) => {
      expect(toMonthlyCents(amount(amountCents, frequency))).toBe(expected);
    },
  );
});

describe("calculateNetMonthlyIncome", () => {
  it("uses a single earner's monthly income", () => {
    expect(
      calculateNetMonthlyIncome({
        earners: [amount(4_000_000, "monthly")],
      }),
    ).toBe(4_000_000);
  });

  it("adds a second earner's annual income as a monthly amount", () => {
    expect(
      calculateNetMonthlyIncome({
        earners: [amount(2_500_000, "monthly"), amount(36_000_000, "annual")],
      }),
    ).toBe(5_500_000);
  });
});

describe("calculateMonthlyExpenses", () => {
  it("adds preset and custom expenses with annual items made monthly", () => {
    const expenses: Expense[] = [
      { category: "rentOrBond", amount: amount(1_000_000, "monthly") },
      { category: "schoolFees", amount: amount(1_200_000, "annual") },
      { category: "custom", label: "Gym", amount: amount(50_000, "monthly") },
    ];
    expect(calculateMonthlyExpenses(expenses)).toBe(1_150_000);
  });

  it("is zero without expenses", () => {
    expect(calculateMonthlyExpenses([])).toBe(0);
  });
});
