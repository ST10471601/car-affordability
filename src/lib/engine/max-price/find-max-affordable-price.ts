import {
  assessAffordability,
  type AffordabilityAssessment,
  type AssessmentContext,
} from "../assessment";
import { CENTS_PER_RAND, cents, randsToCents, type Cents } from "../money";
import type { AffordabilityInput } from "../schemas";

const PRICE_ROUNDING_RANDS = 1_000;

function assessAtPrice(
  input: AffordabilityInput,
  context: AssessmentContext,
  priceCents: Cents,
): AffordabilityAssessment {
  return assessAffordability(
    { ...input, vehicle: { ...input.vehicle, priceCents } },
    context,
  );
}

function isComfortable({ verdict }: AffordabilityAssessment): boolean {
  return verdict.status === "comfortable";
}

function satisfiesFinanceRules({
  breakdown,
}: AffordabilityAssessment): boolean {
  return (
    breakdown.finance === null ||
    breakdown.finance.validation.errors.length === 0
  );
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
): Cents {
  const highestComfortableRands = highestPassing(
    0,
    Math.floor(upperBoundCents / CENTS_PER_RAND),
    (rands) =>
      isComfortable(assessAtPrice(input, context, randsToCents(rands))),
  );
  if (highestComfortableRands === null) {
    return cents(0);
  }

  const candidateCents = randsToCents(
    roundDownToNearest(highestComfortableRands, PRICE_ROUNDING_RANDS),
  );
  const candidate = assessAtPrice(input, context, candidateCents);
  return isComfortable(candidate) && satisfiesFinanceRules(candidate)
    ? candidateCents
    : cents(0);
}
