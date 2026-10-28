import { describe, expect, it } from "vitest";
import { APP_NAME } from "@/lib/site";

describe("site", () => {
  it("exposes the app name", () => {
    expect(APP_NAME).toBe("Car Affordability");
  });
});
