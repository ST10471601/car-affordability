import {
  assessAffordability,
  calculateCarCost,
  type AssessmentContext,
} from "../assessment";
import type { FinanceErrorCode } from "../finance-rules";
import { CENTS_PER_RAND, cents, randsToCents, type Cents } from "../money";
import type { AffordabilityInput } from "../schemas";

const PRICE_ROUNDING_RANDS = 1_000;

export type MaxAffordablePrice =
  | {
      priceCents: Cents;
      limitedBy: "BUDGET" | "UPPER_BOUND" | "EXPENSES_EXCEED_INCOME";
    }
  | {
      priceCents: Cents;
      limitedBy: "FINANCE_RULES";
      blockingErrorCodes: FinanceErrorCode[];
    };

export type PriceLimit = MaxAffordablePrice["limitedBy"];

function withVehiclePrice(
  input: AffordabilityInput,
  priceCents: Cents,
): AffordabilityInput {
  return { ...input, vehicle: { ...input.vehicle, priceCents } };
}

function isComfortableAt(
  input: AffordabilityInput,
  context: AssessmentContext,
  priceCents: Cents,
): boolean {
  const { verdict } = assessAffordability(
    withVehiclePrice(input, priceCents),
    context,
  );
  return verdict.status === "comfortable";
}

function financeErrorCodesAt(
  input: AffordabilityInput,
  context: AssessmentContext,
  priceCents: Cents,
): FinanceErrorCode[] {
  const { finance } = calculateCarCost(
    withVehiclePrice(input, priceCents),
    context,
  ).breakdown;
  return finance?.validation.errors.map(({ code }) => code) ?? [];
}

function highestPassing(
  lowest: number,
  highest: number,
  passes: (value: number) => boolean,
): number | null {
  if (!passes(lowest)) {
    return null;
  }
  let low = lowest;
  let high = highest;
  while (low < high) {
    const middle = low + Math.ceil((high - low) / 2);
    if (passes(middle)) {
      low = middle;
    } else {
      high = middle - 1;
    }
  }
  return low;
}

function roundDownToNearest(value: number, step: number): number {
  return value - (value % step);
}

export function findMaxAffordablePrice(
  input: AffordabilityInput,
  context: AssessmentContext,
  upperBoundCents: Cents,
): MaxAffordablePrice {
  const upperBoundRands = Math.floor(upperBoundCents / CENTS_PER_RAND);
  const highestComfortableRands = highestPassing(0, upperBoundRands, (rands) =>
    isComfortableAt(input, context, randsToCents(rands)),
  );
  if (highestComfortableRands === null) {
    return { priceCents: cents(0), limitedBy: "EXPENSES_EXCEED_INCOME" };
  }

  const priceCents = randsToCents(
    roundDownToNearest(highestComfortableRands, PRICE_ROUNDING_RANDS),
  );
  const blockingErrorCodes = financeErrorCodesAt(input, context, priceCents);
  if (blockingErrorCodes.length > 0) {
    return {
      priceCents: cents(0),
      limitedBy: "FINANCE_RULES",
      blockingErrorCodes,
    };
  }
  return {
    priceCents,
    limitedBy:
      highestComfortableRands === upperBoundRands ? "UPPER_BOUND" : "BUDGET",
  };
}
