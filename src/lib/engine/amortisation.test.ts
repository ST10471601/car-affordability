import { describe, expect, it } from "vitest";
import {
  annuityPayment,
  scheduleInterest,
  type AmortisationTerms,
} from "./amortisation";

const terms: AmortisationTerms = {
  principal: 30_000_000,
  residual: 7_500_000,
  monthlyRate: 0.125 / 12,
  termMonths: 72,
};

function closingBalance(
  { principal, monthlyRate, termMonths }: AmortisationTerms,
  payment: number,
) {
  let balance = principal;
  for (let month = 0; month < termMonths; month += 1) {
    balance = balance * (1 + monthlyRate) - payment;
  }
  return balance;
}

describe("annuityPayment", () => {
  it("matches the exact payment for R300,000 over 72 months at 12.5%", () => {
    expect(annuityPayment({ ...terms, residual: 0 })).toBeCloseTo(
      594_335.361049,
      5,
    );
  });

  it("amortises the principal down to the residual", () => {
    expect(closingBalance(terms, annuityPayment(terms))).toBeCloseTo(
      terms.residual,
      6,
    );
  });

  it("splits the principal evenly at a zero rate", () => {
    expect(
      annuityPayment({
        principal: 1_200,
        residual: 0,
        monthlyRate: 0,
        termMonths: 12,
      }),
    ).toBe(100);
  });

  it("leaves the residual outstanding at a zero rate", () => {
    expect(
      annuityPayment({
        principal: 1_200,
        residual: 600,
        monthlyRate: 0,
        termMonths: 12,
      }),
    ).toBe(50);
  });
});

describe("scheduleInterest", () => {
  it("sums the interest charged each month", () => {
    const payment = annuityPayment(terms);
    expect(scheduleInterest(terms, payment)).toBeCloseTo(
      payment * terms.termMonths + terms.residual - terms.principal,
      6,
    );
  });

  it("charges no interest at a zero rate", () => {
    const zeroRate = { ...terms, monthlyRate: 0 };
    expect(scheduleInterest(zeroRate, annuityPayment(zeroRate))).toBe(0);
  });
});
