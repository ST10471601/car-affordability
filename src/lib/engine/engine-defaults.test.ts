import { describe, expect, it } from "vitest";
import {
  DEFAULT_AFFORDABILITY_CONFIG,
  DEFAULT_FINANCE_RULES,
  DEFAULT_VERDICT_THRESHOLDS,
} from "./engine-defaults";
import { verdictThresholdsSchema } from "./schemas";

describe("DEFAULT_FINANCE_RULES", () => {
  it("allows balloons on vehicles up to 4 years old and warns above 30%", () => {
    expect(DEFAULT_FINANCE_RULES).toEqual({
      maxBalloonVehicleAgeYears: 4,
      balloonWarningBps: 3_000,
    });
  });

  it("cannot be mutated at runtime", () => {
    expect(Object.isFrozen(DEFAULT_FINANCE_RULES)).toBe(true);
  });
});

describe("DEFAULT_VERDICT_THRESHOLDS", () => {
  it("is comfortable below a 20% car cost share and from a 15% buffer", () => {
    expect(DEFAULT_VERDICT_THRESHOLDS).toEqual({
      carCostShare: { comfortableBelowBps: 2_000, unaffordableAboveBps: 3_000 },
      buffer: { comfortableFromBps: 1_500, unaffordableBelowBps: 500 },
    });
  });

  it("satisfies the verdict thresholds schema", () => {
    expect(verdictThresholdsSchema.parse(DEFAULT_VERDICT_THRESHOLDS)).toEqual(
      DEFAULT_VERDICT_THRESHOLDS,
    );
  });

  it("cannot be mutated at runtime", () => {
    expect(Object.isFrozen(DEFAULT_VERDICT_THRESHOLDS)).toBe(true);
    expect(Object.isFrozen(DEFAULT_VERDICT_THRESHOLDS.carCostShare)).toBe(true);
    expect(Object.isFrozen(DEFAULT_VERDICT_THRESHOLDS.buffer)).toBe(true);
  });
});

describe("DEFAULT_AFFORDABILITY_CONFIG", () => {
  it("applies the default finance rules", () => {
    expect(DEFAULT_AFFORDABILITY_CONFIG.financeRules).toBe(
      DEFAULT_FINANCE_RULES,
    );
  });

  it("searches for a maximum price of up to R5,000,000", () => {
    expect(DEFAULT_AFFORDABILITY_CONFIG.maxPriceUpperBoundCents).toBe(
      500_000_000,
    );
  });

  it("cannot be mutated at runtime", () => {
    expect(Object.isFrozen(DEFAULT_AFFORDABILITY_CONFIG)).toBe(true);
  });
});
