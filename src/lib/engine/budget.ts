import { annualToMonthlyCents, cents, type Cents } from "./money";
import type { Expense, Income, RecurringAmount } from "./schemas";

export function toMonthlyCents({
  amountCents,
  frequency,
}: RecurringAmount): Cents {
  return frequency === "annual"
    ? annualToMonthlyCents(amountCents)
    : amountCents;
}

function sumCents(amounts: readonly Cents[]): Cents {
  return cents(amounts.reduce((total, amount) => total + amount, 0));
}

export function calculateNetMonthlyIncome({ earners }: Income): Cents {
  return sumCents(earners.map(toMonthlyCents));
}

export function calculateMonthlyExpenses(expenses: readonly Expense[]): Cents {
  return sumCents(expenses.map(({ amount }) => toMonthlyCents(amount)));
}
