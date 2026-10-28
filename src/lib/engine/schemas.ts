import { z } from "zod";
import { basisPoints, cents } from "./money";

const MIN_TERM_MONTHS = 12;
const MAX_TERM_MONTHS = 84;
const TERM_MONTHS_STEP = 12;
const MAX_BALLOON_BPS = 10_000;
const MAX_EARNERS = 2;

function requiredInteger(label: string) {
  return z.int({
    error: (issue) =>
      issue.input === undefined
        ? `${label} is required.`
        : `Enter a valid ${label.toLowerCase()}.`,
  });
}

function nonNegativeCents(label: string) {
  return requiredInteger(label)
    .min(0, `${label} cannot be negative.`)
    .transform(cents);
}

export const frequencySchema = z.enum(["monthly", "annual"], {
  error: "Choose monthly or annual.",
});

export const recurringAmountSchema = z.object(
  {
    amountCents: nonNegativeCents("Amount"),
    frequency: frequencySchema,
  },
  { error: "Enter an amount and how often it occurs." },
);

export const incomeSchema = z.object(
  {
    earners: z
      .array(recurringAmountSchema, { error: "Add at least one earner." })
      .min(1, "Add at least one earner.")
      .max(MAX_EARNERS, `Income can include at most ${MAX_EARNERS} earners.`),
  },
  { error: "Enter your income." },
);

export const expenseCategorySchema = z.enum([
  "rentOrBond",
  "levies",
  "utilities",
  "debt",
  "insurance",
  "schoolFees",
  "groceries",
  "custom",
]);

const expenseLabelSchema = z
  .string({ error: "Enter a name for this expense." })
  .trim()
  .min(1, "Enter a name for this expense.");

export const expenseSchema = z.discriminatedUnion(
  "category",
  [
    z.object({
      category: expenseCategorySchema.exclude(["custom"]),
      label: expenseLabelSchema.optional(),
      amount: recurringAmountSchema,
    }),
    z.object({
      category: z.literal("custom"),
      label: expenseLabelSchema,
      amount: recurringAmountSchema,
    }),
  ],
  { error: "Choose an expense category." },
);

export const vehicleSchema = z.object(
  {
    priceCents: requiredInteger("Vehicle price")
      .positive("Vehicle price must be greater than zero.")
      .transform(cents),
    modelYear: requiredInteger("Model year"),
  },
  { error: "Enter the vehicle details." },
);

export const tradeInSchema = z.object(
  {
    valueCents: nonNegativeCents("Trade-in value"),
    settlementCents: nonNegativeCents("Settlement amount"),
  },
  { error: "Enter the trade-in details." },
);

export const cashPurchaseSchema = z.object({
  method: z.literal("cash"),
});

const balloonRangeMessage = `Balloon must be between 0% and ${MAX_BALLOON_BPS / 100}%.`;
const termRangeMessage = `Term must be between ${MIN_TERM_MONTHS} and ${MAX_TERM_MONTHS} months.`;

export const financePurchaseSchema = z.object({
  method: z.literal("finance"),
  depositCents: nonNegativeCents("Deposit"),
  balloonBps: requiredInteger("Balloon percentage")
    .min(0, balloonRangeMessage)
    .max(MAX_BALLOON_BPS, balloonRangeMessage)
    .transform(basisPoints),
  termMonths: requiredInteger("Term")
    .min(MIN_TERM_MONTHS, termRangeMessage)
    .max(MAX_TERM_MONTHS, termRangeMessage)
    .multipleOf(TERM_MONTHS_STEP, "Term must be a whole number of years."),
  annualRateBps: requiredInteger("Interest rate")
    .positive("Interest rate must be greater than 0%.")
    .transform(basisPoints),
});

export const purchaseSchema = z.discriminatedUnion(
  "method",
  [cashPurchaseSchema, financePurchaseSchema],
  { error: "Choose cash or finance." },
);

export const financeFeesSchema = z.object(
  {
    initiationFeeCents: nonNegativeCents("Initiation fee"),
    monthlyServiceFeeCents: nonNegativeCents("Monthly service fee"),
  },
  { error: "Enter the finance fees." },
);

export type Frequency = z.infer<typeof frequencySchema>;
export type RecurringAmount = z.infer<typeof recurringAmountSchema>;
export type Income = z.infer<typeof incomeSchema>;
export type ExpenseCategory = z.infer<typeof expenseCategorySchema>;
export type Expense = z.infer<typeof expenseSchema>;
export type Vehicle = z.infer<typeof vehicleSchema>;
export type TradeIn = z.infer<typeof tradeInSchema>;
export type CashPurchase = z.infer<typeof cashPurchaseSchema>;
export type FinancePurchase = z.infer<typeof financePurchaseSchema>;
export type Purchase = z.infer<typeof purchaseSchema>;
export type FinanceFees = z.infer<typeof financeFeesSchema>;
