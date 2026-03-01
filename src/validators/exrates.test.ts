import { describe, it, expect } from "vitest";
import { validateAverages } from "./exrates.js";

describe("validateAverages", () => {
  it("routes to currency endpoint when only currency is provided", () => {
    expect(validateAverages({ currency: "EUR" })).toEqual({
      ok: true,
      data: { endpoint: "currency", currency: "EUR" },
    });
  });

  it("routes to year endpoint when only year is provided", () => {
    expect(validateAverages({ year: 2024 })).toEqual({
      ok: true,
      data: { endpoint: "year", year: 2024 },
    });
  });

  it("prefers year endpoint when both currency and year are provided", () => {
    expect(validateAverages({ currency: "EUR", year: 2024 })).toEqual({
      ok: true,
      data: { endpoint: "year", year: 2024 },
    });
  });

  it("returns error when neither currency nor year is provided", () => {
    const result = validateAverages({});
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("At least one of 'currency' or 'year' must be provided");
    }
  });
});
