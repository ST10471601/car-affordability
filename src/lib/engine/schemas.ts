import { z } from "zod";
import { calculateNetMonthlyIncome } from "./budget";
import { basisPoints, cents } from "./money";

const MIN_TERM_MONTHS = 12;
const MAX_TERM_MONTHS = 84;
const TERM_MONTHS_STEP = 12;
const MAX_PERCENTAGE_BPS = 10_000;
const MAX_EARNERS = 2;
const MIN_NET_MONTHLY_INCOME_CENTS = 100_000;
const MIN_OWNERSHIP_MONTHS = 1;
const MAX_OWNERSHIP_MONTHS = 240;
const MAX_INSURANCE_RATE = 1;

function requiredFieldError(label: string): z.core.$ZodErrorMap {
  return (issue) =>
    issue.input === undefined
      ? `${label} is required.`
      : `Enter a valid ${label.toLowerCase()}.`;
}

function requiredInteger(label: string) {
  return z.int({ error: requiredFieldError(label) });
}

function requiredNumber(label: string) {
  return z.number({ error: requiredFieldError(label) });
}

function nonNegativeInteger(label: string) {
  return requiredInteger(label).min(0, `${label} cannot be negative.`);
}

function nonNegativeCents(label: string) {
  return nonNegativeInteger(label).transform(cents);
}

function percentageBps(label: string) {
  const rangeMessage = `${label} must be between 0% and ${MAX_PERCENTAGE_BPS / 100}%.`;
  return requiredInteger(label)
    .min(0, rangeMessage)
    .max(MAX_PERCENTAGE_BPS, rangeMessage)
    .transform(basisPoints);
}

const onlyWhenValid = {
  when: (payload: z.core.ParsePayload) => payload.issues.length === 0,
};

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

export const incomeSchema = z
  .object(
    {
      earners: z
        .array(recurringAmountSchema, { error: "Add at least one earner." })
        .min(1, "Add at least one earner.")
        .max(MAX_EARNERS, `Income can include at most ${MAX_EARNERS} earners.`),
    },
    { error: "Enter your income." },
  )
  .refine(
    (income) =>
      calculateNetMonthlyIncome(income) >= MIN_NET_MONTHLY_INCOME_CENTS,
    {
      message: "Net monthly income must be at least R1,000.",
      ...onlyWhenValid,
    },
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

const balloonRangeMessage = `Balloon must be between 0% and ${MAX_PERCENTAGE_BPS / 100}%.`;
const interestRateRangeMessage = `Interest rate must be between 0% and ${MAX_PERCENTAGE_BPS / 100}%.`;
const termRangeMessage = `Term must be between ${MIN_TERM_MONTHS} and ${MAX_TERM_MONTHS} months.`;

export const financePurchaseSchema = z.object({
  method: z.literal("finance"),
  depositCents: nonNegativeCents("Deposit"),
  balloonBps: requiredInteger("Balloon percentage")
    .min(0, balloonRangeMessage)
    .max(MAX_PERCENTAGE_BPS, balloonRangeMessage)
    .transform(basisPoints),
  termMonths: requiredInteger("Term")
    .min(MIN_TERM_MONTHS, termRangeMessage)
    .max(MAX_TERM_MONTHS, termRangeMessage)
    .multipleOf(TERM_MONTHS_STEP, "Term must be a whole number of years."),
  annualRateBps: requiredInteger("Interest rate")
    .min(0, interestRateRangeMessage)
    .max(MAX_PERCENTAGE_BPS, interestRateRangeMessage)
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

export const powertrainSchema = z.enum(
  ["petrol", "diesel", "hybrid", "plugInHybrid", "electric"],
  { error: "Choose a powertrain." },
);

export const regionSchema = z.enum(["inland", "coastal"], {
  error: "Choose inland or coastal.",
});

export const fuelPricesSchema = z.object(
  {
    petrol: nonNegativeCents("Petrol price"),
    diesel: nonNegativeCents("Diesel price"),
  },
  { error: "Enter petrol and diesel prices." },
);

export const maintenanceAgeBandSchema = z.object(
  {
    maxAgeYears: nonNegativeInteger("Maximum age").nullable(),
    centsPerKm: nonNegativeCents("Maintenance cost per kilometre"),
  },
  { error: "Enter the maintenance age band." },
);

type AgeLimited = { maxAgeYears: number | null };

function endsOpenEnded(bands: readonly AgeLimited[]) {
  return bands.at(-1)?.maxAgeYears === null;
}

function boundsEveryEarlierBand(bands: readonly AgeLimited[]) {
  return bands.slice(0, -1).every(({ maxAgeYears }) => maxAgeYears !== null);
}

function ascendsByMaxAge(bands: readonly AgeLimited[]) {
  const limits = bands.flatMap(({ maxAgeYears }) =>
    maxAgeYears === null ? [] : [maxAgeYears],
  );
  return limits.every((limit, index) => {
    const previous = limits[index - 1];
    return previous === undefined || limit > previous;
  });
}

export const maintenanceAgeBandsSchema = z
  .array(maintenanceAgeBandSchema, {
    error: "Enter the maintenance age bands.",
  })
  .min(1, { error: "Add at least one maintenance age band.", abort: true })
  .refine(endsOpenEnded, "The last maintenance age band must be open-ended.")
  .refine(
    boundsEveryEarlierBand,
    "Only the last maintenance age band can be open-ended.",
  )
  .refine(
    ascendsByMaxAge,
    "Maintenance age bands must be in order of increasing maximum age.",
  );

const insuranceRateRangeMessage = `Insurance rate must be between 0 and ${MAX_INSURANCE_RATE}.`;

export const runningCostRatesSchema = z.object(
  {
    fuelPriceCentsPerLitre: z.record(regionSchema, fuelPricesSchema),
    electricityTariffCentsPerKwh: nonNegativeCents("Electricity tariff"),
    consumptionUpliftByPowertrain: z.record(
      powertrainSchema,
      requiredNumber("Consumption uplift").min(
        0,
        "Consumption uplift cannot be negative.",
      ),
    ),
    insuranceAnnualRateOfValue: requiredNumber("Insurance rate")
      .min(0, insuranceRateRangeMessage)
      .max(MAX_INSURANCE_RATE, insuranceRateRangeMessage),
    maintenanceCentsPerKmByAgeBand: maintenanceAgeBandsSchema,
    tyreSetCents: nonNegativeCents("Tyre set price"),
    tyreLifeKm: requiredInteger("Tyre life").positive(
      "Tyre life must be greater than zero.",
    ),
    licenceAnnualCents: nonNegativeCents("Licence fee"),
    effectiveFrom: z.iso.date({ error: requiredFieldError("Effective date") }),
  },
  { error: "Enter the running cost rates." },
);

export const servicePlanSchema = z.object(
  {
    remainingMonths: nonNegativeInteger("Remaining service plan term"),
    remainingKm: nonNegativeInteger("Remaining service plan distance"),
  },
  { error: "Enter the service plan details." },
);

const ownershipRangeMessage = `Ownership period must be between ${MIN_OWNERSHIP_MONTHS} and ${MAX_OWNERSHIP_MONTHS} months.`;

const ownershipMonthsSchema = requiredInteger("Ownership period")
  .min(MIN_OWNERSHIP_MONTHS, ownershipRangeMessage)
  .max(MAX_OWNERSHIP_MONTHS, ownershipRangeMessage);

export const runningCostInputSchema = z.object(
  {
    powertrain: powertrainSchema,
    claimedConsumption: requiredNumber("Claimed consumption").positive(
      "Claimed consumption must be greater than zero.",
    ),
    region: regionSchema,
    vehicleValueCents: requiredInteger("Vehicle value")
      .positive("Vehicle value must be greater than zero.")
      .transform(cents),
    vehicleAgeYearsAtPurchase: nonNegativeInteger("Vehicle age"),
    kmPerMonth: nonNegativeInteger("Monthly distance"),
    ownershipMonths: ownershipMonthsSchema,
    servicePlan: servicePlanSchema.nullable(),
    insuranceMonthlyOverrideCents:
      nonNegativeCents("Insurance premium").optional(),
  },
  { error: "Enter the running cost details." },
);

export const verdictThresholdsSchema = z.object(
  {
    carCostShare: z
      .object(
        {
          comfortableBelowBps: percentageBps(
            "Comfortable car cost share limit",
          ),
          unaffordableAboveBps: percentageBps(
            "Unaffordable car cost share limit",
          ),
        },
        { error: "Enter the car cost share thresholds." },
      )
      .refine(
        ({ comfortableBelowBps, unaffordableAboveBps }) =>
          comfortableBelowBps <= unaffordableAboveBps,
        {
          message:
            "The comfortable car cost share limit cannot exceed the unaffordable limit.",
          path: ["comfortableBelowBps"],
          ...onlyWhenValid,
        },
      ),
    buffer: z
      .object(
        {
          comfortableFromBps: percentageBps("Comfortable buffer limit"),
          unaffordableBelowBps: percentageBps("Unaffordable buffer limit"),
        },
        { error: "Enter the buffer thresholds." },
      )
      .refine(
        ({ comfortableFromBps, unaffordableBelowBps }) =>
          comfortableFromBps >= unaffordableBelowBps,
        {
          message:
            "The comfortable buffer limit cannot be below the unaffordable limit.",
          path: ["comfortableFromBps"],
          ...onlyWhenValid,
        },
      ),
  },
  { error: "Enter the verdict thresholds." },
);

export const vehicleUsageSchema = runningCostInputSchema.omit({
  vehicleValueCents: true,
  vehicleAgeYearsAtPurchase: true,
  ownershipMonths: true,
});

export const affordabilityPurchaseSchema = z.discriminatedUnion(
  "method",
  [
    cashPurchaseSchema.extend({ ownershipMonths: ownershipMonthsSchema }),
    financePurchaseSchema.extend({ fees: financeFeesSchema }),
  ],
  { error: "Choose cash or finance." },
);

export const affordabilityInputSchema = z.object(
  {
    income: incomeSchema,
    expenses: z.array(expenseSchema, { error: "Enter your expenses." }),
    vehicle: vehicleSchema,
    tradeIn: tradeInSchema.optional(),
    purchase: affordabilityPurchaseSchema,
    usage: vehicleUsageSchema,
    currentYear: requiredInteger("Current year"),
  },
  { error: "Enter the affordability details." },
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
export type Powertrain = z.infer<typeof powertrainSchema>;
export type Region = z.infer<typeof regionSchema>;
export type FuelPrices = z.infer<typeof fuelPricesSchema>;
export type MaintenanceAgeBand = z.infer<typeof maintenanceAgeBandSchema>;
export type RunningCostRates = z.infer<typeof runningCostRatesSchema>;
export type ServicePlan = z.infer<typeof servicePlanSchema>;
export type RunningCostInput = z.infer<typeof runningCostInputSchema>;
export type VerdictThresholds = z.infer<typeof verdictThresholdsSchema>;
export type VehicleUsage = z.infer<typeof vehicleUsageSchema>;
export type AffordabilityPurchase = z.infer<typeof affordabilityPurchaseSchema>;
export type AffordabilityInput = z.infer<typeof affordabilityInputSchema>;
