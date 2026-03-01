import { describe, it, expect } from "vitest";
import { valid, invalid, validationError, validateDateOrYear } from "../../src/validators/base.js";

// ---------------------------------------------------------------------------
// valid()
// ---------------------------------------------------------------------------
describe("valid", () => {
  it("returns ok: true with data", () => {
    expect(valid("hello")).toEqual({ ok: true, data: "hello" });
    expect(valid(42)).toEqual({ ok: true, data: 42 });
    expect(valid({ a: 1 })).toEqual({ ok: true, data: { a: 1 } });
  });
});

// ---------------------------------------------------------------------------
// invalid()
// ---------------------------------------------------------------------------
describe("invalid", () => {
  it("returns ok: false with error", () => {
    expect(invalid("something went wrong")).toEqual({
      ok: false,
      error: "something went wrong",
    });
  });
});

// ---------------------------------------------------------------------------
// validationError()
// ---------------------------------------------------------------------------
describe("validationError", () => {
  it("returns MCP-compatible error object", () => {
    expect(validationError("bad input")).toEqual({
      content: [{ type: "text", text: "bad input" }],
      isError: true,
    });
  });
});

// ---------------------------------------------------------------------------
// validateDateOrYear()
// ---------------------------------------------------------------------------
describe("validateDateOrYear", () => {
  it("routes to year endpoint when year is provided", () => {
    expect(validateDateOrYear({ year: 2024 })).toEqual({
      endpoint: "year",
      year: 2024,
    });
  });

  it("routes to daily endpoint when date is provided", () => {
    expect(validateDateOrYear({ date: "2024-01-15" })).toEqual({
      endpoint: "daily",
      date: "2024-01-15",
    });
  });

  it("routes to daily endpoint with undefined date when nothing is provided", () => {
    expect(validateDateOrYear({})).toEqual({
      endpoint: "daily",
      date: undefined,
    });
  });

  it("prefers year when both date and year are provided", () => {
    expect(validateDateOrYear({ date: "2024-01-15", year: 2024 })).toEqual({
      endpoint: "year",
      year: 2024,
    });
  });
});
