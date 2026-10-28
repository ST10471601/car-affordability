export type AmortisationTerms = {
  readonly principal: number;
  readonly residual: number;
  readonly monthlyRate: number;
  readonly termMonths: number;
};

export function annuityPayment({
  principal,
  residual,
  monthlyRate,
  termMonths,
}: AmortisationTerms): number {
  if (monthlyRate === 0) {
    return (principal - residual) / termMonths;
  }
  const growth = (1 + monthlyRate) ** termMonths;
  return ((principal * growth - residual) * monthlyRate) / (growth - 1);
}

export function scheduleInterest(
  { principal, monthlyRate, termMonths }: AmortisationTerms,
  payment: number,
): number {
  let balance = principal;
  let totalInterest = 0;
  for (let month = 0; month < termMonths; month += 1) {
    const interest = balance * monthlyRate;
    totalInterest += interest;
    balance += interest - payment;
  }
  return totalInterest;
}
