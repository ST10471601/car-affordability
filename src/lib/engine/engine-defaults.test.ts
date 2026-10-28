import { describe, expect, it } from "vitest";
import { DEFAULT_FINANCE_RULES } from "./engine-defaults";

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
