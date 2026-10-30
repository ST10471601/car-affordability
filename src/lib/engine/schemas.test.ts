import { describe, expect, it } from "vitest";
import type { z } from "zod";
import {
  affordabilityValues,
  cashPurchase,
  financedPurchase,
} from "./affordability.fixtures";
import {
  buildRunningCostInput,
  runningCostRates,
} from "./running-costs/running-costs.fixtures";
import {
  affordabilityInputSchema,
  expenseSchema,
  financeFeesSchema,
  frequencySchema,
  incomeSchema,
  purchaseSchema,
  recurringAmountSchema,
  runningCostInputSchema,
  runningCostRatesSchema,
  tradeInSchema,
  vehicleSchema,
  verdictThresholdsSchema,
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

  it.each([
    {
      name: "exactly R1,000 a month",
      earners: [{ amountCents: 100_000, frequency: "monthly" }],
    },
    {
      name: "R12,000 a year",
      earners: [{ amountCents: 1_200_000, frequency: "annual" }],
    },
    {
      name: "a joint income where one earner earns nothing",
      earners: [
        { amountCents: 0, frequency: "monthly" },
        { amountCents: 100_000, frequency: "monthly" },
      ],
    },
  ])("accepts $name", ({ earners }) => {
    expect(issuesOf(incomeSchema, { earners })).toEqual([]);
  });

  expectRejections(incomeSchema, [
    {
      name: "no income",
      input: { earners: [{ amountCents: 0, frequency: "monthly" }] },
      path: [],
      message: "Net monthly income must be at least R1,000.",
    },
    {
      name: "an income just below R1,000 a month",
      input: { earners: [{ amountCents: 99_999, frequency: "monthly" }] },
      path: [],
      message: "Net monthly income must be at least R1,000.",
    },
    {
      name: "an annual income just below R1,000 a month",
      input: { earners: [{ amountCents: 1_199_988, frequency: "annual" }] },
      path: [],
      message: "Net monthly income must be at least R1,000.",
    },
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

describe("runningCostRatesSchema", () => {
  it("accepts a complete set of rates", () => {
    expect(runningCostRatesSchema.parse(runningCostRates)).toEqual(
      runningCostRates,
    );
  });

  it("accepts a single open-ended maintenance band", () => {
    const rates = {
      ...runningCostRates,
      maintenanceCentsPerKmByAgeBand: [{ maxAgeYears: null, centsPerKm: 80 }],
    };
    expect(runningCostRatesSchema.parse(rates)).toEqual(rates);
  });

  it("accepts free electricity", () => {
    expect(
      issuesOf(runningCostRatesSchema, {
        ...runningCostRates,
        electricityTariffCentsPerKwh: 0,
      }),
    ).toEqual([]);
  });

  expectRejections(runningCostRatesSchema, [
    {
      name: "a region without fuel prices",
      input: {
        ...runningCostRates,
        fuelPriceCentsPerLitre: {
          inland: runningCostRates.fuelPriceCentsPerLitre.inland,
        },
      },
      path: ["fuelPriceCentsPerLitre", "coastal"],
      message: "Enter petrol and diesel prices.",
    },
    {
      name: "a negative diesel price",
      input: {
        ...runningCostRates,
        fuelPriceCentsPerLitre: {
          ...runningCostRates.fuelPriceCentsPerLitre,
          inland: { petrol: 2_200, diesel: -1 },
        },
      },
      path: ["fuelPriceCentsPerLitre", "inland", "diesel"],
      message: "Diesel price cannot be negative.",
    },
    {
      name: "a fractional electricity tariff",
      input: { ...runningCostRates, electricityTariffCentsPerKwh: 350.5 },
      path: ["electricityTariffCentsPerKwh"],
      message: "Enter a valid electricity tariff.",
    },
    {
      name: "a powertrain without a consumption uplift",
      input: {
        ...runningCostRates,
        consumptionUpliftByPowertrain: {
          petrol: 0.15,
          diesel: 0.1,
          hybrid: 0.25,
          electric: 0.2,
        },
      },
      path: ["consumptionUpliftByPowertrain", "plugInHybrid"],
      message: "Consumption uplift is required.",
    },
    {
      name: "a negative consumption uplift",
      input: {
        ...runningCostRates,
        consumptionUpliftByPowertrain: {
          ...runningCostRates.consumptionUpliftByPowertrain,
          electric: -0.05,
        },
      },
      path: ["consumptionUpliftByPowertrain", "electric"],
      message: "Consumption uplift cannot be negative.",
    },
    {
      name: "a negative insurance rate",
      input: { ...runningCostRates, insuranceAnnualRateOfValue: -0.01 },
      path: ["insuranceAnnualRateOfValue"],
      message: "Insurance rate must be between 0 and 1.",
    },
    {
      name: "an insurance rate above 1",
      input: { ...runningCostRates, insuranceAnnualRateOfValue: 1.01 },
      path: ["insuranceAnnualRateOfValue"],
      message: "Insurance rate must be between 0 and 1.",
    },
    {
      name: "no maintenance bands",
      input: { ...runningCostRates, maintenanceCentsPerKmByAgeBand: [] },
      path: ["maintenanceCentsPerKmByAgeBand"],
      message: "Add at least one maintenance age band.",
    },
    {
      name: "a bounded last maintenance band",
      input: {
        ...runningCostRates,
        maintenanceCentsPerKmByAgeBand: [
          { maxAgeYears: 3, centsPerKm: 40 },
          { maxAgeYears: 6, centsPerKm: 70 },
        ],
      },
      path: ["maintenanceCentsPerKmByAgeBand"],
      message: "The last maintenance age band must be open-ended.",
    },
    {
      name: "an open-ended maintenance band before the last",
      input: {
        ...runningCostRates,
        maintenanceCentsPerKmByAgeBand: [
          { maxAgeYears: null, centsPerKm: 40 },
          { maxAgeYears: null, centsPerKm: 70 },
        ],
      },
      path: ["maintenanceCentsPerKmByAgeBand"],
      message: "Only the last maintenance age band can be open-ended.",
    },
    {
      name: "maintenance bands out of age order",
      input: {
        ...runningCostRates,
        maintenanceCentsPerKmByAgeBand: [
          { maxAgeYears: 6, centsPerKm: 70 },
          { maxAgeYears: 3, centsPerKm: 40 },
          { maxAgeYears: null, centsPerKm: 110 },
        ],
      },
      path: ["maintenanceCentsPerKmByAgeBand"],
      message:
        "Maintenance age bands must be in order of increasing maximum age.",
    },
    {
      name: "maintenance bands sharing a maximum age",
      input: {
        ...runningCostRates,
        maintenanceCentsPerKmByAgeBand: [
          { maxAgeYears: 3, centsPerKm: 40 },
          { maxAgeYears: 3, centsPerKm: 70 },
          { maxAgeYears: null, centsPerKm: 110 },
        ],
      },
      path: ["maintenanceCentsPerKmByAgeBand"],
      message:
        "Maintenance age bands must be in order of increasing maximum age.",
    },
    {
      name: "a maintenance band without a maximum age",
      input: {
        ...runningCostRates,
        maintenanceCentsPerKmByAgeBand: [
          { centsPerKm: 40 },
          { maxAgeYears: null, centsPerKm: 110 },
        ],
      },
      path: ["maintenanceCentsPerKmByAgeBand", 0, "maxAgeYears"],
      message: "Maximum age is required.",
    },
    {
      name: "a zero tyre life",
      input: { ...runningCostRates, tyreLifeKm: 0 },
      path: ["tyreLifeKm"],
      message: "Tyre life must be greater than zero.",
    },
    {
      name: "a negative licence fee",
      input: { ...runningCostRates, licenceAnnualCents: -1 },
      path: ["licenceAnnualCents"],
      message: "Licence fee cannot be negative.",
    },
    {
      name: "an impossible effective date",
      input: { ...runningCostRates, effectiveFrom: "2026-13-01" },
      path: ["effectiveFrom"],
      message: "Enter a valid effective date.",
    },
    {
      name: "a missing effective date",
      input: { ...runningCostRates, effectiveFrom: undefined },
      path: ["effectiveFrom"],
      message: "Effective date is required.",
    },
    {
      name: "missing rates",
      input: undefined,
      path: [],
      message: "Enter the running cost rates.",
    },
  ]);
});

describe("runningCostInputSchema", () => {
  const input = buildRunningCostInput({});

  it("accepts input without a service plan or insurance override", () => {
    expect(runningCostInputSchema.parse(input)).toEqual(input);
  });

  it("accepts a service plan and an insurance override", () => {
    const covered = buildRunningCostInput({
      servicePlan: { remainingMonths: 24, remainingKm: 60_000 },
      insuranceMonthlyOverrideCents: 85_000,
    });
    expect(runningCostInputSchema.parse(covered)).toEqual(covered);
  });

  it.each(["petrol", "diesel", "hybrid", "plugInHybrid", "electric"])(
    "accepts a %s powertrain",
    (powertrain) => {
      expect(
        issuesOf(runningCostInputSchema, { ...input, powertrain }),
      ).toEqual([]);
    },
  );

  it.each([
    { name: "zero kilometres per month", overrides: { kmPerMonth: 0 } },
    { name: "a one-month ownership period", overrides: { ownershipMonths: 1 } },
    {
      name: "a 240-month ownership period",
      overrides: { ownershipMonths: 240 },
    },
    {
      name: "an expired service plan",
      overrides: { servicePlan: { remainingMonths: 0, remainingKm: 0 } },
    },
    {
      name: "a zero insurance override",
      overrides: { insuranceMonthlyOverrideCents: 0 },
    },
  ])("accepts $name", ({ overrides }) => {
    expect(
      issuesOf(runningCostInputSchema, { ...input, ...overrides }),
    ).toEqual([]);
  });

  expectRejections(runningCostInputSchema, [
    {
      name: "an unknown powertrain",
      input: { ...input, powertrain: "hydrogen" },
      path: ["powertrain"],
      message: "Choose a powertrain.",
    },
    {
      name: "an unknown region",
      input: { ...input, region: "northern" },
      path: ["region"],
      message: "Choose inland or coastal.",
    },
    {
      name: "zero claimed consumption",
      input: { ...input, claimedConsumption: 0 },
      path: ["claimedConsumption"],
      message: "Claimed consumption must be greater than zero.",
    },
    {
      name: "a non-numeric claimed consumption",
      input: { ...input, claimedConsumption: "7" },
      path: ["claimedConsumption"],
      message: "Enter a valid claimed consumption.",
    },
    {
      name: "a zero vehicle value",
      input: { ...input, vehicleValueCents: 0 },
      path: ["vehicleValueCents"],
      message: "Vehicle value must be greater than zero.",
    },
    {
      name: "a negative vehicle age",
      input: { ...input, vehicleAgeYearsAtPurchase: -1 },
      path: ["vehicleAgeYearsAtPurchase"],
      message: "Vehicle age cannot be negative.",
    },
    {
      name: "a fractional vehicle age",
      input: { ...input, vehicleAgeYearsAtPurchase: 2.5 },
      path: ["vehicleAgeYearsAtPurchase"],
      message: "Enter a valid vehicle age.",
    },
    {
      name: "negative kilometres per month",
      input: { ...input, kmPerMonth: -1 },
      path: ["kmPerMonth"],
      message: "Monthly distance cannot be negative.",
    },
    {
      name: "fractional kilometres per month",
      input: { ...input, kmPerMonth: 1_666.67 },
      path: ["kmPerMonth"],
      message: "Enter a valid monthly distance.",
    },
    {
      name: "a zero ownership period",
      input: { ...input, ownershipMonths: 0 },
      path: ["ownershipMonths"],
      message: "Ownership period must be between 1 and 240 months.",
    },
    {
      name: "an ownership period above 240 months",
      input: { ...input, ownershipMonths: 241 },
      path: ["ownershipMonths"],
      message: "Ownership period must be between 1 and 240 months.",
    },
    {
      name: "a missing ownership period",
      input: { ...input, ownershipMonths: undefined },
      path: ["ownershipMonths"],
      message: "Ownership period is required.",
    },
    {
      name: "a missing service plan",
      input: { ...input, servicePlan: undefined },
      path: ["servicePlan"],
      message: "Enter the service plan details.",
    },
    {
      name: "a negative remaining service plan term",
      input: { ...input, servicePlan: { remainingMonths: -1, remainingKm: 0 } },
      path: ["servicePlan", "remainingMonths"],
      message: "Remaining service plan term cannot be negative.",
    },
    {
      name: "a fractional remaining service plan distance",
      input: {
        ...input,
        servicePlan: { remainingMonths: 12, remainingKm: 0.5 },
      },
      path: ["servicePlan", "remainingKm"],
      message: "Enter a valid remaining service plan distance.",
    },
    {
      name: "a negative insurance override",
      input: { ...input, insuranceMonthlyOverrideCents: -1 },
      path: ["insuranceMonthlyOverrideCents"],
      message: "Insurance premium cannot be negative.",
    },
    {
      name: "missing input",
      input: undefined,
      path: [],
      message: "Enter the running cost details.",
    },
  ]);
});

describe("verdictThresholdsSchema", () => {
  const thresholds = {
    carCostShare: { comfortableBelowBps: 2_000, unaffordableAboveBps: 3_000 },
    buffer: { comfortableFromBps: 1_500, unaffordableBelowBps: 500 },
  };

  it("accepts ordered thresholds", () => {
    expect(verdictThresholdsSchema.parse(thresholds)).toEqual(thresholds);
  });

  it("accepts comfortable and unaffordable limits that coincide", () => {
    const coinciding = {
      carCostShare: { comfortableBelowBps: 2_500, unaffordableAboveBps: 2_500 },
      buffer: { comfortableFromBps: 1_000, unaffordableBelowBps: 1_000 },
    };
    expect(verdictThresholdsSchema.parse(coinciding)).toEqual(coinciding);
  });

  expectRejections(verdictThresholdsSchema, [
    {
      name: "a comfortable car cost share limit above the unaffordable limit",
      input: {
        ...thresholds,
        carCostShare: {
          comfortableBelowBps: 3_001,
          unaffordableAboveBps: 3_000,
        },
      },
      path: ["carCostShare", "comfortableBelowBps"],
      message:
        "The comfortable car cost share limit cannot exceed the unaffordable limit.",
    },
    {
      name: "a comfortable buffer limit below the unaffordable limit",
      input: {
        ...thresholds,
        buffer: { comfortableFromBps: 499, unaffordableBelowBps: 500 },
      },
      path: ["buffer", "comfortableFromBps"],
      message:
        "The comfortable buffer limit cannot be below the unaffordable limit.",
    },
    {
      name: "a car cost share limit above 100%",
      input: {
        ...thresholds,
        carCostShare: {
          comfortableBelowBps: 2_000,
          unaffordableAboveBps: 10_001,
        },
      },
      path: ["carCostShare", "unaffordableAboveBps"],
      message: "Unaffordable car cost share limit must be between 0% and 100%.",
    },
    {
      name: "a comfortable car cost share limit above 100% and its limit",
      input: {
        ...thresholds,
        carCostShare: {
          comfortableBelowBps: 10_001,
          unaffordableAboveBps: 3_000,
        },
      },
      path: ["carCostShare", "comfortableBelowBps"],
      message: "Comfortable car cost share limit must be between 0% and 100%.",
    },
    {
      name: "a negative buffer limit",
      input: {
        ...thresholds,
        buffer: { comfortableFromBps: 1_500, unaffordableBelowBps: -1 },
      },
      path: ["buffer", "unaffordableBelowBps"],
      message: "Unaffordable buffer limit must be between 0% and 100%.",
    },
    {
      name: "a fractional buffer limit",
      input: {
        ...thresholds,
        buffer: { comfortableFromBps: 1_500.5, unaffordableBelowBps: 500 },
      },
      path: ["buffer", "comfortableFromBps"],
      message: "Enter a valid comfortable buffer limit.",
    },
    {
      name: "missing buffer thresholds",
      input: { carCostShare: thresholds.carCostShare },
      path: ["buffer"],
      message: "Enter the buffer thresholds.",
    },
    {
      name: "missing thresholds",
      input: undefined,
      path: [],
      message: "Enter the verdict thresholds.",
    },
  ]);
});

describe("affordabilityInputSchema", () => {
  it("accepts a financed purchase with its fees", () => {
    expect(affordabilityInputSchema.parse(affordabilityValues)).toEqual(
      affordabilityValues,
    );
  });

  it("accepts a cash purchase with an ownership period", () => {
    const values = { ...affordabilityValues, purchase: cashPurchase };
    expect(affordabilityInputSchema.parse(values)).toEqual(values);
  });

  it.each([
    {
      name: "a trade-in",
      overrides: { tradeIn: { valueCents: 8_000_000, settlementCents: 0 } },
    },
    { name: "no expenses", overrides: { expenses: [] } },
    {
      name: "a service plan and insurance override",
      overrides: {
        usage: {
          ...affordabilityValues.usage,
          servicePlan: { remainingMonths: 24, remainingKm: 60_000 },
          insuranceMonthlyOverrideCents: 85_000,
        },
      },
    },
  ])("accepts $name", ({ overrides }) => {
    expect(
      issuesOf(affordabilityInputSchema, {
        ...affordabilityValues,
        ...overrides,
      }),
    ).toEqual([]);
  });

  it("ignores running cost fields derived from the vehicle and purchase", () => {
    expect(
      affordabilityInputSchema.parse({
        ...affordabilityValues,
        usage: {
          ...affordabilityValues.usage,
          vehicleValueCents: 1,
          vehicleAgeYearsAtPurchase: 9,
          ownershipMonths: 1,
        },
      }).usage,
    ).toEqual(affordabilityValues.usage);
  });

  expectRejections(affordabilityInputSchema, [
    {
      name: "an income below R1,000 a month",
      input: {
        ...affordabilityValues,
        income: { earners: [{ amountCents: 0, frequency: "monthly" }] },
      },
      path: ["income"],
      message: "Net monthly income must be at least R1,000.",
    },
    {
      name: "missing expenses",
      input: { ...affordabilityValues, expenses: undefined },
      path: ["expenses"],
      message: "Enter your expenses.",
    },
    {
      name: "a cash purchase without an ownership period",
      input: { ...affordabilityValues, purchase: { method: "cash" } },
      path: ["purchase", "ownershipMonths"],
      message: "Ownership period is required.",
    },
    {
      name: "a cash purchase owned for longer than 240 months",
      input: {
        ...affordabilityValues,
        purchase: { ...cashPurchase, ownershipMonths: 241 },
      },
      path: ["purchase", "ownershipMonths"],
      message: "Ownership period must be between 1 and 240 months.",
    },
    {
      name: "a financed purchase without fees",
      input: {
        ...affordabilityValues,
        purchase: { ...financedPurchase, fees: undefined },
      },
      path: ["purchase", "fees"],
      message: "Enter the finance fees.",
    },
    {
      name: "an unknown purchase method",
      input: { ...affordabilityValues, purchase: { method: "lease" } },
      path: ["purchase", "method"],
      message: "Choose cash or finance.",
    },
    {
      name: "missing usage",
      input: { ...affordabilityValues, usage: undefined },
      path: ["usage"],
      message: "Enter the running cost details.",
    },
    {
      name: "negative kilometres per month",
      input: {
        ...affordabilityValues,
        usage: { ...affordabilityValues.usage, kmPerMonth: -1 },
      },
      path: ["usage", "kmPerMonth"],
      message: "Monthly distance cannot be negative.",
    },
    {
      name: "a missing current year",
      input: { ...affordabilityValues, currentYear: undefined },
      path: ["currentYear"],
      message: "Current year is required.",
    },
    {
      name: "missing input",
      input: undefined,
      path: [],
      message: "Enter the affordability details.",
    },
  ]);
});
