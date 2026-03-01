import { describe, it, expect } from "vitest";
import { validatePriborYear } from "./pribor.js";

describe("validatePriborYear", () => {
  it("routes to specific-term when only period is provided", () => {
    expect(validatePriborYear({ period: "THREE_MONTH" })).toEqual({
      ok: true,
      data: {
        endpoint: "specific-term",
        year: undefined,
        period: "THREE_MONTH",
      },
    });
  });

  it("routes to specific-term with year when both are provided", () => {
    expect(validatePriborYear({ year: 2024, period: "ONE_DAY" })).toEqual({
      ok: true,
      data: { endpoint: "specific-term", year: 2024, period: "ONE_DAY" },
    });
  });

  it("routes to all-terms when only year is provided", () => {
    expect(validatePriborYear({ year: 2024 })).toEqual({
      ok: true,
      data: { endpoint: "all-terms", year: 2024 },
    });
  });

  it("routes to all-terms with year undefined when nothing is provided", () => {
    expect(validatePriborYear({})).toEqual({
      ok: true,
      data: { endpoint: "all-terms", year: undefined },
    });
  });
});
