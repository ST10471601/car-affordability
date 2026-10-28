import { describe, expect, it } from "vitest";
import { buildFinanceInput, type FinanceScenario } from "./finance.fixtures";
import { validateFinance, type FinanceRules } from "./finance-rules";
import { basisPoints } from "./money";

const CURRENT_YEAR = 2026;

const rules: FinanceRules = {
  maxBalloonVehicleAgeYears: 4,
  balloonWarningBps: basisPoints(3_000),
};

function validate(
  scenario: FinanceScenario,
  ruleOverrides: Partial<FinanceRules> = {},
) {
  return validateFinance(
    buildFinanceInput(scenario),
    { ...rules, ...ruleOverrides },
    CURRENT_YEAR,
  );
}

describe("validateFinance", () => {
  it("reports nothing for a typical deal", () => {
    expect(validate({ depositCents: 3_000_000, balloonBps: 2_500 })).toEqual({
      errors: [],
      warnings: [],
    });
  });

  it("reports every error that applies", () => {
    expect(
      validate({
        depositCents: 30_000_000,
        balloonBps: 2_500,
        modelYear: 2020,
      }),
    ).toEqual({
      errors: [
        { code: "NOTHING_TO_FINANCE", principalCents: 0 },
        {
          code: "BALLOON_EXCEEDS_PRINCIPAL",
          balloonCents: 7_500_000,
          principalCents: 0,
        },
        {
          code: "BALLOON_NOT_ALLOWED_FOR_AGE",
          vehicleAgeYears: 6,
          maxBalloonVehicleAgeYears: 4,
        },
      ],
      warnings: [],
    });
  });

  describe("NOTHING_TO_FINANCE", () => {
    it("is reported when the deposit covers the price", () => {
      expect(validate({ depositCents: 30_000_000 }).errors).toEqual([
        { code: "NOTHING_TO_FINANCE", principalCents: 0 },
      ]);
    });

    it("is reported when trade-in equity exceeds the price", () => {
      expect(
        validate({ tradeIn: { valueCents: 35_000_000, settlementCents: 0 } })
          .errors,
      ).toEqual([{ code: "NOTHING_TO_FINANCE", principalCents: -5_000_000 }]);
    });

    it("is not reported while an initiation fee remains to be financed", () => {
      expect(
        validate({ depositCents: 30_000_000, initiationFeeCents: 120_750 })
          .errors,
      ).toEqual([]);
    });
  });

  describe("BALLOON_EXCEEDS_PRINCIPAL", () => {
    it("is reported when the balloon is larger than the principal", () => {
      expect(
        validate({ depositCents: 24_000_000, balloonBps: 2_500 }).errors,
      ).toEqual([
        {
          code: "BALLOON_EXCEEDS_PRINCIPAL",
          balloonCents: 7_500_000,
          principalCents: 6_000_000,
        },
      ]);
    });

    it("is not reported when the balloon equals the principal", () => {
      expect(
        validate({ depositCents: 22_500_000, balloonBps: 2_500 }).errors,
      ).toEqual([]);
    });
  });

  describe("BALLOON_NOT_ALLOWED_FOR_AGE", () => {
    it("is reported for a balloon on a vehicle older than the limit", () => {
      expect(validate({ modelYear: 2021, balloonBps: 1_000 }).errors).toEqual([
        {
          code: "BALLOON_NOT_ALLOWED_FOR_AGE",
          vehicleAgeYears: 5,
          maxBalloonVehicleAgeYears: 4,
        },
      ]);
    });

    it("is not reported for a vehicle exactly at the age limit", () => {
      expect(validate({ modelYear: 2022, balloonBps: 1_000 }).errors).toEqual(
        [],
      );
    });

    it("is not reported for an older vehicle without a balloon", () => {
      expect(validate({ modelYear: 2015 }).errors).toEqual([]);
    });

    it("uses the age limit from the supplied rules", () => {
      expect(
        validate(
          { modelYear: 2021, balloonBps: 1_000 },
          { maxBalloonVehicleAgeYears: 6 },
        ).errors,
      ).toEqual([]);
    });
  });

  describe("HIGH_BALLOON", () => {
    it("is reported for a balloon above the warning threshold", () => {
      expect(validate({ balloonBps: 3_001 })).toEqual({
        errors: [],
        warnings: [
          {
            code: "HIGH_BALLOON",
            balloonBps: 3_001,
            balloonWarningBps: 3_000,
          },
        ],
      });
    });

    it("is not reported for a balloon exactly at the threshold", () => {
      expect(validate({ balloonBps: 3_000 }).warnings).toEqual([]);
    });

    it("uses the threshold from the supplied rules", () => {
      expect(
        validate(
          { balloonBps: 2_500 },
          { balloonWarningBps: basisPoints(2_000) },
        ).warnings,
      ).toEqual([
        { code: "HIGH_BALLOON", balloonBps: 2_500, balloonWarningBps: 2_000 },
      ]);
    });
  });
});
