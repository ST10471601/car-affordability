import type { FinanceInput } from "./finance";
import { basisPoints, cents } from "./money";

export type FinanceScenario = {
  priceCents?: number;
  modelYear?: number;
  depositCents?: number;
  balloonBps?: number;
  termMonths?: number;
  annualRateBps?: number;
  initiationFeeCents?: number;
  monthlyServiceFeeCents?: number;
  tradeIn?: { valueCents: number; settlementCents: number };
};

export const wesbankCalculatorFees = {
  initiationFeeCents: 120_750,
  monthlyServiceFeeCents: 6_900,
} satisfies FinanceScenario;

export function buildFinanceInput({
  priceCents = 30_000_000,
  modelYear = 2024,
  depositCents = 0,
  balloonBps = 0,
  termMonths = 72,
  annualRateBps = 1_250,
  initiationFeeCents = 0,
  monthlyServiceFeeCents = 0,
  tradeIn,
}: FinanceScenario): FinanceInput {
  return {
    vehicle: { priceCents: cents(priceCents), modelYear },
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
