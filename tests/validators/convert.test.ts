import { describe, it, expect } from "vitest";
import { validateConvert } from "../../src/validators/convert.js";

describe("validateConvert", () => {
  it("returns ok with sameCurrency: false for different currencies", () => {
    expect(validateConvert({ amount: 100, from: "EUR", to: "CZK" })).toEqual({
      ok: true,
      data: { sameCurrency: false },
    });
  });

  it("returns ok with sameCurrency: true for same currencies", () => {
    expect(validateConvert({ amount: 100, from: "EUR", to: "EUR" })).toEqual({
      ok: true,
      data: { sameCurrency: true },
    });
  });

  it("returns error when amount is zero", () => {
    const result = validateConvert({ amount: 0, from: "EUR", to: "CZK" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Amount must be greater than zero");
    }
  });

  it("returns error when amount is negative", () => {
    const result = validateConvert({ amount: -5, from: "EUR", to: "CZK" });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toContain("Amount must be greater than zero");
    }
  });

  it("accepts small positive amounts", () => {
    expect(validateConvert({ amount: 0.01, from: "EUR", to: "CZK" })).toEqual({
      ok: true,
      data: { sameCurrency: false },
    });
  });
});
