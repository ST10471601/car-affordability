import { annuityPayment, scheduleInterest } from "./amortisation";
import {
  applyBasisPoints,
  basisPointsToRate,
  cents,
  MONTHS_PER_YEAR,
  roundToCents,
  type Cents,
} from "./money";
import type { FinanceFees, FinancePurchase, TradeIn, Vehicle } from "./schemas";

export type FinanceInput = {
  vehicle: Vehicle;
  purchase: FinancePurchase;
  tradeIn?: TradeIn;
  fees: FinanceFees;
};

export type FinanceResult = {
  principalCents: Cents;
  monthlyInstalmentCents: Cents;
  balloonCents: Cents;
  totalInterestCents: Cents;
  totalCostCents: Cents;
};

export function calculateTradeInEquity(tradeIn: TradeIn | undefined): Cents {
  return cents(tradeIn ? tradeIn.valueCents - tradeIn.settlementCents : 0);
}

export function calculatePrincipal({
  vehicle,
  purchase,
  tradeIn,
  fees,
}: FinanceInput): Cents {
  return cents(
    vehicle.priceCents -
      purchase.depositCents -
      calculateTradeInEquity(tradeIn) +
      fees.initiationFeeCents,
  );
}

export function calculateBalloon({
  vehicle,
  purchase,
}: Pick<FinanceInput, "vehicle" | "purchase">): Cents {
  return roundToCents(
    applyBasisPoints(vehicle.priceCents, purchase.balloonBps),
  );
}

export function calculateFinance(input: FinanceInput): FinanceResult {
  const { purchase, fees } = input;
  const principal = calculatePrincipal(input);
  const balloon = calculateBalloon(input);
  const terms = {
    principal,
    residual: balloon,
    monthlyRate: basisPointsToRate(purchase.annualRateBps) / MONTHS_PER_YEAR,
    termMonths: purchase.termMonths,
  };
  const payment = annuityPayment(terms);
  const totalInterest = roundToCents(scheduleInterest(terms, payment));

  return {
    principalCents: principal,
    monthlyInstalmentCents: cents(
      roundToCents(payment) + fees.monthlyServiceFeeCents,
    ),
    balloonCents: balloon,
    totalInterestCents: totalInterest,
    totalCostCents: cents(
      purchase.depositCents +
        calculateTradeInEquity(input.tradeIn) +
        principal +
        totalInterest +
        fees.monthlyServiceFeeCents * purchase.termMonths,
    ),
  };
}
