import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  expenseSchema,
  financeFeesSchema,
  frequencySchema,
  incomeSchema,
  purchaseSchema,
  recurringAmountSchema,
  tradeInSchema,
  vehicleSchema,
} from "./schemas";

type Rejection = {
  name: string;
  input: unknown;
  path: PropertyKey[];
  message: string;
};

function issuesOf(schema: z.ZodType, input: unknown) {
  const result = schema.safeParse(input);
  return result.success
    ? []
    : result.error.issues.map(({ path, message }) => ({ path, message }));
}

function expectRejections(schema: z.ZodType, rejections: Rejection[]) {
  it.each(rejections)("rejects $name", ({ input, path, message }) => {
    expect(issuesOf(schema, input)).toEqual([{ path, message }]);
  });
}

const monthlyAmount = { amountCents: 2_500_000, frequency: "monthly" };

const financePurchase = {
  method: "finance",
  depositCents: 3_000_000,
  balloonBps: 2_500,
  termMonths: 72,
  annualRateBps: 1_250,
};

describe("frequencySchema", () => {
  it.each(["monthly", "annual"])("accepts %s", (frequency) => {
    expect(frequencySchema.parse(frequency)).toBe(frequency);
  });

  expectRejections(frequencySchema, [
    {
      name: "an unknown frequency",
      input: "weekly",
      path: [],
      message: "Choose monthly or annual.",
    },
    {
      name: "a missing frequency",
      input: undefined,
      path: [],
      message: "Choose monthly or annual.",
    },
  ]);
});

describe("recurringAmountSchema", () => {
  it("accepts a monthly amount", () => {
    expect(recurringAmountSchema.parse(monthlyAmount)).toEqual(monthlyAmount);
  });

  it("accepts a zero annual amount", () => {
    const amount = { amountCents: 0, frequency: "annual" };
    expect(recurringAmountSchema.parse(amount)).toEqual(amount);
  });

  expectRejections(recurringAmountSchema, [
    {
      name: "a negative amount",
      input: { ...monthlyAmount, amountCents: -1 },
      path: ["amountCents"],
      message: "Amount cannot be negative.",
    },
    {
      name: "a fractional amount",
      input: { ...monthlyAmount, amountCents: 12.5 },
      path: ["amountCents"],
      message: "Enter a valid amount.",
    },
    {
      name: "a non-numeric amount",
      input: { ...monthlyAmount, amountCents: "100" },
      path: ["amountCents"],
      message: "Enter a valid amount.",
    },
    {
      name: "a missing amount",
      input: { frequency: "monthly" },
      path: ["amountCents"],
      message: "Amount is required.",
    },
    {
      name: "an unknown frequency",
      input: { ...monthlyAmount, frequency: "weekly" },
      path: ["frequency"],
      message: "Choose monthly or annual.",
    },
    {
      name: "a missing frequency",
      input: { amountCents: 100 },
      path: ["frequency"],
      message: "Choose monthly or annual.",
    },
    {
      name: "a missing recurring amount",
      input: undefined,
      path: [],
      message: "Enter an amount and how often it occurs.",
    },
  ]);
});

describe("incomeSchema", () => {
  it("accepts a single earner", () => {
    const income = { earners: [monthlyAmount] };
    expect(incomeSchema.parse(income)).toEqual(income);
  });

  it("accepts two earners", () => {
    const income = {
      earners: [
        monthlyAmount,
        { amountCents: 36_000_000, frequency: "annual" },
      ],
    };
    expect(incomeSchema.parse(income)).toEqual(income);
  });

  expectRejections(incomeSchema, [
    {
      name: "no earners",
      input: { earners: [] },
      path: ["earners"],
      message: "Add at least one earner.",
    },
    {
      name: "missing earners",
      input: {},
      path: ["earners"],
      message: "Add at least one earner.",
    },
    {
      name: "more than two earners",
      input: { earners: [monthlyAmount, monthlyAmount, monthlyAmount] },
      path: ["earners"],
      message: "Income can include at most 2 earners.",
    },
    {
      name: "an invalid earner",
      input: { earners: [{ ...monthlyAmount, amountCents: -5 }] },
      path: ["earners", 0, "amountCents"],
      message: "Amount cannot be negative.",
    },
    {
      name: "missing income",
      input: undefined,
      path: [],
      message: "Enter your income.",
    },
  ]);
});

describe("expenseSchema", () => {
  it.each([
    "rentOrBond",
    "levies",
    "utilities",
    "debt",
    "insurance",
    "schoolFees",
    "groceries",
  ])("accepts a %s expense without a label", (category) => {
    const expense = { category, amount: monthlyAmount };
    expect(expenseSchema.parse(expense)).toEqual(expense);
  });

  it("accepts a labelled standard expense", () => {
    const expense = {
      category: "insurance",
      label: "Household contents",
      amount: monthlyAmount,
    };
    expect(expenseSchema.parse(expense)).toEqual(expense);
  });

  it("accepts a custom expense and trims its label", () => {
    expect(
      expenseSchema.parse({
        category: "custom",
        label: "  Gym  ",
        amount: monthlyAmount,
      }),
    ).toEqual({
      category: "custom",
      label: "Gym",
      amount: monthlyAmount,
    });
  });

  expectRejections(expenseSchema, [
    {
      name: "an unknown category",
      input: { category: "fuel", amount: monthlyAmount },
      path: ["category"],
      message: "Choose an expense category.",
    },
    {
      name: "a missing category",
      input: { amount: monthlyAmount },
      path: ["category"],
      message: "Choose an expense category.",
    },
    {
      name: "a custom expense without a label",
      input: { category: "custom", amount: monthlyAmount },
      path: ["label"],
      message: "Enter a name for this expense.",
    },
    {
      name: "a custom expense with a blank label",
      input: { category: "custom", label: "   ", amount: monthlyAmount },
      path: ["label"],
      message: "Enter a name for this expense.",
    },
    {
      name: "a standard expense with an empty label",
      input: { category: "levies", label: "", amount: monthlyAmount },
      path: ["label"],
      message: "Enter a name for this expense.",
    },
    {
      name: "a missing amount",
      input: { category: "groceries" },
      path: ["amount"],
      message: "Enter an amount and how often it occurs.",
    },
    {
      name: "a negative amount",
      input: {
        category: "debt",
        amount: { ...monthlyAmount, amountCents: -1 },
      },
      path: ["amount", "amountCents"],
      message: "Amount cannot be negative.",
    },
  ]);
});

describe("vehicleSchema", () => {
  it("accepts a priced vehicle", () => {
    const vehicle = { priceCents: 30_000_000, modelYear: 2024 };
    expect(vehicleSchema.parse(vehicle)).toEqual(vehicle);
  });

  expectRejections(vehicleSchema, [
    {
      name: "a zero price",
      input: { priceCents: 0, modelYear: 2024 },
      path: ["priceCents"],
      message: "Vehicle price must be greater than zero.",
    },
    {
      name: "a negative price",
      input: { priceCents: -100, modelYear: 2024 },
      path: ["priceCents"],
      message: "Vehicle price must be greater than zero.",
    },
    {
      name: "a fractional price",
      input: { priceCents: 1.5, modelYear: 2024 },
      path: ["priceCents"],
      message: "Enter a valid vehicle price.",
    },
    {
      name: "a missing price",
      input: { modelYear: 2024 },
      path: ["priceCents"],
      message: "Vehicle price is required.",
    },
    {
      name: "a fractional model year",
      input: { priceCents: 100, modelYear: 2024.5 },
      path: ["modelYear"],
      message: "Enter a valid model year.",
    },
    {
      name: "a non-numeric model year",
      input: { priceCents: 100, modelYear: "2024" },
      path: ["modelYear"],
      message: "Enter a valid model year.",
    },
    {
      name: "a missing model year",
      input: { priceCents: 100 },
      path: ["modelYear"],
      message: "Model year is required.",
    },
    {
      name: "a missing vehicle",
      input: undefined,
      path: [],
      message: "Enter the vehicle details.",
    },
  ]);
});

describe("tradeInSchema", () => {
  it("accepts zero values", () => {
    const tradeIn = { valueCents: 0, settlementCents: 0 };
    expect(tradeInSchema.parse(tradeIn)).toEqual(tradeIn);
  });

  it("accepts a settlement above the trade-in value", () => {
    const tradeIn = { valueCents: 5_000_000, settlementCents: 7_000_000 };
    expect(tradeInSchema.parse(tradeIn)).toEqual(tradeIn);
  });

  expectRejections(tradeInSchema, [
    {
      name: "a negative value",
      input: { valueCents: -1, settlementCents: 0 },
      path: ["valueCents"],
      message: "Trade-in value cannot be negative.",
    },
    {
      name: "a negative settlement",
      input: { valueCents: 0, settlementCents: -1 },
      path: ["settlementCents"],
      message: "Settlement amount cannot be negative.",
    },
    {
      name: "a fractional value",
      input: { valueCents: 0.5, settlementCents: 0 },
      path: ["valueCents"],
      message: "Enter a valid trade-in value.",
    },
    {
      name: "a missing settlement",
      input: { valueCents: 0 },
      path: ["settlementCents"],
      message: "Settlement amount is required.",
    },
    {
      name: "a missing trade-in",
      input: undefined,
      path: [],
      message: "Enter the trade-in details.",
    },
  ]);
});

describe("purchaseSchema", () => {
  it("accepts a cash purchase", () => {
    expect(purchaseSchema.parse({ method: "cash" })).toEqual({
      method: "cash",
    });
  });

  it("accepts a finance purchase", () => {
    expect(purchaseSchema.parse(financePurchase)).toEqual(financePurchase);
  });

  it.each([0, 10_000])("accepts a balloon of %s basis points", (balloonBps) => {
    expect(
      issuesOf(purchaseSchema, { ...financePurchase, balloonBps }),
    ).toEqual([]);
  });

  it.each([12, 24, 36, 48, 60, 72, 84])(
    "accepts a %s-month term",
    (termMonths) => {
      expect(
        issuesOf(purchaseSchema, { ...financePurchase, termMonths }),
      ).toEqual([]);
    },
  );

  it.each([0, 1, 10_000])(
    "accepts an interest rate of %s basis points",
    (annualRateBps) => {
      expect(
        issuesOf(purchaseSchema, { ...financePurchase, annualRateBps }),
      ).toEqual([]);
    },
  );

  it("reports every term rule a value breaks", () => {
    expect(
      issuesOf(purchaseSchema, { ...financePurchase, termMonths: 6 }),
    ).toEqual([
      {
        path: ["termMonths"],
        message: "Term must be between 12 and 84 months.",
      },
      {
        path: ["termMonths"],
        message: "Term must be a whole number of years.",
      },
    ]);
  });

  expectRejections(purchaseSchema, [
    {
      name: "an unknown method",
      input: { method: "lease" },
      path: ["method"],
      message: "Choose cash or finance.",
    },
    {
      name: "a missing method",
      input: {},
      path: ["method"],
      message: "Choose cash or finance.",
    },
    {
      name: "a negative deposit",
      input: { ...financePurchase, depositCents: -1 },
      path: ["depositCents"],
      message: "Deposit cannot be negative.",
    },
    {
      name: "a missing deposit",
      input: { ...financePurchase, depositCents: undefined },
      path: ["depositCents"],
      message: "Deposit is required.",
    },
    {
      name: "a negative balloon",
      input: { ...financePurchase, balloonBps: -1 },
      path: ["balloonBps"],
      message: "Balloon must be between 0% and 100%.",
    },
    {
      name: "a balloon above 100%",
      input: { ...financePurchase, balloonBps: 10_001 },
      path: ["balloonBps"],
      message: "Balloon must be between 0% and 100%.",
    },
    {
      name: "a fractional balloon",
      input: { ...financePurchase, balloonBps: 12.5 },
      path: ["balloonBps"],
      message: "Enter a valid balloon percentage.",
    },
    {
      name: "a term below 12 months",
      input: { ...financePurchase, termMonths: 0 },
      path: ["termMonths"],
      message: "Term must be between 12 and 84 months.",
    },
    {
      name: "a term above 84 months",
      input: { ...financePurchase, termMonths: 96 },
      path: ["termMonths"],
      message: "Term must be between 12 and 84 months.",
    },
    {
      name: "a term that is not whole years",
      input: { ...financePurchase, termMonths: 18 },
      path: ["termMonths"],
      message: "Term must be a whole number of years.",
    },
    {
      name: "a fractional term",
      input: { ...financePurchase, termMonths: 72.5 },
      path: ["termMonths"],
      message: "Enter a valid term.",
    },
    {
      name: "a missing term",
      input: { ...financePurchase, termMonths: undefined },
      path: ["termMonths"],
      message: "Term is required.",
    },
    {
      name: "a negative interest rate",
      input: { ...financePurchase, annualRateBps: -1 },
      path: ["annualRateBps"],
      message: "Interest rate must be between 0% and 100%.",
    },
    {
      name: "an interest rate above 100%",
      input: { ...financePurchase, annualRateBps: 10_001 },
      path: ["annualRateBps"],
      message: "Interest rate must be between 0% and 100%.",
    },
    {
      name: "a fractional interest rate",
      input: { ...financePurchase, annualRateBps: 12.5 },
      path: ["annualRateBps"],
      message: "Enter a valid interest rate.",
    },
  ]);
});

describe("financeFeesSchema", () => {
  it("accepts zero fees", () => {
    const fees = { initiationFeeCents: 0, monthlyServiceFeeCents: 0 };
    expect(financeFeesSchema.parse(fees)).toEqual(fees);
  });

  it("accepts typical fees", () => {
    const fees = { initiationFeeCents: 120_750, monthlyServiceFeeCents: 6_900 };
    expect(financeFeesSchema.parse(fees)).toEqual(fees);
  });

  expectRejections(financeFeesSchema, [
    {
      name: "a negative initiation fee",
      input: { initiationFeeCents: -1, monthlyServiceFeeCents: 0 },
      path: ["initiationFeeCents"],
      message: "Initiation fee cannot be negative.",
    },
    {
      name: "a negative service fee",
      input: { initiationFeeCents: 0, monthlyServiceFeeCents: -1 },
      path: ["monthlyServiceFeeCents"],
      message: "Monthly service fee cannot be negative.",
    },
    {
      name: "a fractional initiation fee",
      input: { initiationFeeCents: 0.5, monthlyServiceFeeCents: 0 },
      path: ["initiationFeeCents"],
      message: "Enter a valid initiation fee.",
    },
    {
      name: "a missing service fee",
      input: { initiationFeeCents: 0 },
      path: ["monthlyServiceFeeCents"],
      message: "Monthly service fee is required.",
    },
    {
      name: "missing fees",
      input: undefined,
      path: [],
      message: "Enter the finance fees.",
    },
  ]);
});
