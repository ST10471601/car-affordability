import type { z } from "zod";
import { affordabilityInputSchema, type AffordabilityInput } from "./schemas";

export type AffordabilityValues = z.input<typeof affordabilityInputSchema>;

export const financedPurchase = {
  method: "finance",
  depositCents: 0,
  balloonBps: 0,
  termMonths: 72,
  annualRateBps: 1_250,
  fees: { initiationFeeCents: 120_750, monthlyServiceFeeCents: 6_900 },
} satisfies AffordabilityValues["purchase"];

export const cashPurchase = {
  method: "cash",
  ownershipMonths: 72,
} satisfies AffordabilityValues["purchase"];

export const affordabilityValues: AffordabilityValues = {
  income: { earners: [{ amountCents: 4_000_000, frequency: "monthly" }] },
  expenses: [
    {
      category: "rentOrBond",
      amount: { amountCents: 1_000_000, frequency: "monthly" },
    },
    {
      category: "schoolFees",
      amount: { amountCents: 1_200_000, frequency: "annual" },
    },
    {
      category: "custom",
      label: "Gym",
      amount: { amountCents: 50_000, frequency: "monthly" },
    },
  ],
  vehicle: { priceCents: 30_000_000, modelYear: 2024 },
  purchase: financedPurchase,
  usage: {
    powertrain: "petrol",
    claimedConsumption: 7,
    region: "inland",
    kmPerMonth: 1_500,
    servicePlan: null,
  },
  currentYear: 2026,
};

export function affordabilityValuesWith(
  overrides: Partial<AffordabilityValues>,
): AffordabilityValues {
  return { ...affordabilityValues, ...overrides };
}

export function buildAffordabilityInput(
  overrides: Partial<AffordabilityValues>,
): AffordabilityInput {
  return affordabilityInputSchema.parse(affordabilityValuesWith(overrides));
}
