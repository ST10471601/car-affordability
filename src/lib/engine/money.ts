declare const centsBrand: unique symbol;
declare const basisPointsBrand: unique symbol;

export type Cents = number & { readonly [centsBrand]: true };
export type BasisPoints = number & { readonly [basisPointsBrand]: true };

const CENTS_PER_RAND = 100;
const MONTHS_PER_YEAR = 12;

export function cents(value: number): Cents {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `Expected a whole number of cents, received ${value}.`,
    );
  }
  return value as Cents;
}

export function basisPoints(value: number): BasisPoints {
  if (!Number.isSafeInteger(value)) {
    throw new RangeError(
      `Expected a whole number of basis points, received ${value}.`,
    );
  }
  return value as BasisPoints;
}

export function roundToCents(value: number): Cents {
  const magnitude = Math.round(Math.abs(value));
  return cents(value < 0 && magnitude !== 0 ? -magnitude : magnitude);
}

export function randsToCents(rands: number): Cents {
  return roundToCents(rands * CENTS_PER_RAND);
}

export function annualToMonthlyCents(annual: Cents): Cents {
  return roundToCents(annual / MONTHS_PER_YEAR);
}
