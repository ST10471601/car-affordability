import type { Cents } from "./money";
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

export const calculateFinance: (input: FinanceInput) => FinanceResult = () => {
  throw new Error("calculateFinance is not implemented.");
};
