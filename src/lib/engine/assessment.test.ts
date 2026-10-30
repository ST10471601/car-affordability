import { describe, expect, it } from "vitest";
import {
  affordabilityValues,
  assessmentContext,
  buildAffordabilityInput,
  cashPurchase,
  financedPurchase,
  type AffordabilityValues,
} from "./affordability.fixtures";
import { assessAffordability } from "./assessment";

function assess(overrides: Partial<AffordabilityValues>) {
  return assessAffordability(
    buildAffordabilityInput(overrides),
    assessmentContext,
  );
}

describe("assessAffordability", () => {
  it("adds the finance instalment to the running costs", () => {
    expect(assess({})).toEqual({
      monthlyCarCostCents: 1_104_278,
      breakdown: {
        finance: {
          principalCents: 30_120_750,
          monthlyInstalmentCents: 603_628,
          balloonCents: 0,
          totalInterestCents: 12_843_634,
          totalCostCents: 43_461_184,
          validation: { errors: [], warnings: [] },
        },
        runningCosts: {
          fuelMonthlyAverageCents: 265_650,
          insuranceMonthlyAverageCents: 100_000,
          maintenanceMonthlyAverageCents: 100_000,
          tyresMonthlyAverageCents: 30_000,
          licenceMonthlyAverageCents: 5_000,
          totalMonthlyAverageCents: 500_650,
          servicePlanEndsAtMonth: null,
        },
      },
      verdict: {
        status: "stretched",
        checks: {
          carCostShare: { status: "stretched", valueBps: 2_761 },
          buffer: { status: "comfortable", valueBps: 4_364 },
        },
        reasons: ["CAR_COST_SHARE_HIGH"],
      },
    });
  });

  it("counts only running costs for a cash purchase", () => {
    expect(assess({ purchase: cashPurchase })).toMatchObject({
      monthlyCarCostCents: 500_650,
      breakdown: { finance: null },
      verdict: {
        status: "comfortable",
        checks: {
          carCostShare: { status: "comfortable", valueBps: 1_252 },
          buffer: { status: "comfortable", valueBps: 5_873 },
        },
        reasons: [],
      },
    });
  });

  it("averages running costs over a cash ownership period", () => {
    const { runningCosts } = assess({
      purchase: { ...cashPurchase, ownershipMonths: 12 },
    }).breakdown;
    expect(runningCosts).toMatchObject({
      maintenanceMonthlyAverageCents: 60_000,
      totalMonthlyAverageCents: 460_650,
    });
  });

  it("estimates insurance from the vehicle price", () => {
    expect(
      assess({
        purchase: cashPurchase,
        vehicle: { ...affordabilityValues.vehicle, priceCents: 60_000_000 },
      }).breakdown.runningCosts.insuranceMonthlyAverageCents,
    ).toBe(200_000);
  });

  it("treats a model year after the current year as a new vehicle", () => {
    expect(
      assess({ vehicle: { ...affordabilityValues.vehicle, modelYear: 2027 } })
        .breakdown.runningCosts.maintenanceMonthlyAverageCents,
    ).toBe(75_000);
  });

  it("applies trade-in equity to the finance principal", () => {
    expect(
      assess({ tradeIn: { valueCents: 8_000_000, settlementCents: 5_000_000 } })
        .breakdown.finance?.principalCents,
    ).toBe(27_120_750);
  });

  it("reports finance rule breaches without changing the verdict", () => {
    const assessment = assess({
      vehicle: { ...affordabilityValues.vehicle, modelYear: 2020 },
      purchase: { ...financedPurchase, balloonBps: 2_500 },
    });
    expect(assessment.breakdown.finance?.validation).toEqual({
      errors: [
        {
          code: "BALLOON_NOT_ALLOWED_FOR_AGE",
          vehicleAgeYears: 6,
          maxBalloonVehicleAgeYears: 4,
        },
      ],
      warnings: [],
    });
    expect(assessment.verdict.status).toBe("stretched");
  });
});
