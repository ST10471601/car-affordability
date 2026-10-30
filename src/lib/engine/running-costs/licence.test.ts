import { describe, expect, it } from "vitest";
import { cents } from "../money";
import { calculateMonthlyLicence } from "./licence";
import { runningCostRates } from "./running-costs.fixtures";

describe("calculateMonthlyLicence", () => {
  it.each([
    { annual: 60_000, expected: 5_000 },
    { annual: 64_994, expected: 5_416 },
    { annual: 65_000, expected: 5_417 },
    { annual: 0, expected: 0 },
  ])(
    "charges a twelfth of $annual annual cents as $expected cents",
    ({ annual, expected }) => {
      expect(
        calculateMonthlyLicence({
          ...runningCostRates,
          licenceAnnualCents: cents(annual),
        }),
      ).toBe(expected);
    },
  );
});
