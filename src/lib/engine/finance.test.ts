import { describe, expect, it } from "vitest";
import { calculateFinance, type FinanceInput } from "./finance";
import { basisPoints, cents } from "./money";

type Scenario = {
  priceCents?: number;
  depositCents?: number;
  balloonBps?: number;
  termMonths?: number;
  annualRateBps?: number;
  initiationFeeCents?: number;
  monthlyServiceFeeCents?: number;
  tradeIn?: { valueCents: number; settlementCents: number };
};

type ExpectedResult = {
  principalCents: number;
  monthlyInstalmentCents: number;
  balloonCents: number;
  totalInterestCents: number;
  totalCostCents: number;
};

function buildInput({
  priceCents = 30_000_000,
  depositCents = 0,
  balloonBps = 0,
  termMonths = 72,
  annualRateBps = 1_250,
  initiationFeeCents = 0,
  monthlyServiceFeeCents = 0,
  tradeIn,
}: Scenario): FinanceInput {
  return {
    vehicle: { priceCents: cents(priceCents), modelYear: 2024 },
    purchase: {
      method: "finance",
      depositCents: cents(depositCents),
      balloonBps: basisPoints(balloonBps),
      termMonths,
      annualRateBps: basisPoints(annualRateBps),
    },
    fees: {
      initiationFeeCents: cents(initiationFeeCents),
      monthlyServiceFeeCents: cents(monthlyServiceFeeCents),
    },
    ...(tradeIn && {
      tradeIn: {
        valueCents: cents(tradeIn.valueCents),
        settlementCents: cents(tradeIn.settlementCents),
      },
    }),
  };
}

const cases: { name: string; scenario: Scenario; expected: ExpectedResult }[] =
  [
    {
      name: "R300,000 over 72 months at 12.5% with no deposit, balloon or fees",
      scenario: {},
      expected: {
        principalCents: 30_000_000,
        monthlyInstalmentCents: 594_335,
        balloonCents: 0,
        totalInterestCents: 12_792_146,
        totalCostCents: 42_792_120,
      },
    },
    {
      name: "a 10% deposit reduces the principal",
      scenario: { depositCents: 3_000_000 },
      expected: {
        principalCents: 27_000_000,
        monthlyInstalmentCents: 534_902,
        balloonCents: 0,
        totalInterestCents: 11_512_931,
        totalCostCents: 41_512_944,
      },
    },
    {
      name: "a 25% balloon remains as the residual after the final instalment",
      scenario: { balloonBps: 2_500 },
      expected: {
        principalCents: 30_000_000,
        monthlyInstalmentCents: 523_877,
        balloonCents: 7_500_000,
        totalInterestCents: 15_219_109,
        totalCostCents: 45_219_144,
      },
    },
    {
      name: "the initiation fee is financed and the service fee is added to the instalment",
      scenario: { initiationFeeCents: 120_750, monthlyServiceFeeCents: 6_900 },
      expected: {
        principalCents: 30_120_750,
        monthlyInstalmentCents: 603_628,
        balloonCents: 0,
        totalInterestCents: 12_843_634,
        totalCostCents: 43_461_216,
      },
    },
    {
      name: "positive trade-in equity reduces the principal",
      scenario: {
        tradeIn: { valueCents: 8_000_000, settlementCents: 5_000_000 },
      },
      expected: {
        principalCents: 27_000_000,
        monthlyInstalmentCents: 534_902,
        balloonCents: 0,
        totalInterestCents: 11_512_931,
        totalCostCents: 38_512_944,
      },
    },
    {
      name: "negative trade-in equity increases the principal",
      scenario: {
        tradeIn: { valueCents: 5_000_000, settlementCents: 7_000_000 },
      },
      expected: {
        principalCents: 32_000_000,
        monthlyInstalmentCents: 633_958,
        balloonCents: 0,
        totalInterestCents: 13_644_956,
        totalCostCents: 45_644_976,
      },
    },
    {
      name: "a 0% rate splits the principal evenly across the term",
      scenario: { annualRateBps: 0 },
      expected: {
        principalCents: 30_000_000,
        monthlyInstalmentCents: 416_667,
        balloonCents: 0,
        totalInterestCents: 0,
        totalCostCents: 30_000_024,
      },
    },
    {
      name: "the minimum 12-month term",
      scenario: { termMonths: 12 },
      expected: {
        principalCents: 30_000_000,
        monthlyInstalmentCents: 2_672_486,
        balloonCents: 0,
        totalInterestCents: 2_069_831,
        totalCostCents: 32_069_832,
      },
    },
    {
      name: "the maximum 84-month term",
      scenario: { termMonths: 84 },
      expected: {
        principalCents: 30_000_000,
        monthlyInstalmentCents: 537_637,
        balloonCents: 0,
        totalInterestCents: 15_161_521,
        totalCostCents: 45_161_508,
      },
    },
    {
      name: "deposit, balloon, fees and trade-in equity combined",
      scenario: {
        depositCents: 3_000_000,
        balloonBps: 2_500,
        initiationFeeCents: 120_750,
        monthlyServiceFeeCents: 6_900,
        tradeIn: { valueCents: 8_000_000, settlementCents: 5_000_000 },
      },
      expected: {
        principalCents: 24_120_750,
        monthlyInstalmentCents: 414_302,
        balloonCents: 7_500_000,
        totalInterestCents: 12_712_169,
        totalCostCents: 40_329_744,
      },
    },
  ];

describe("calculateFinance", () => {
  it.each(cases)("$name", ({ scenario, expected }) => {
    expect(calculateFinance(buildInput(scenario))).toEqual(expected);
  });
});
