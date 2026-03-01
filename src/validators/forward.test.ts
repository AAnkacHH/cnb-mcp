import { describe, it, expect } from "vitest";
import { validateForward } from "./forward.js";

describe("validateForward", () => {
  it("routes to range with default currencyPair and maturity when only dateFrom is provided", () => {
    expect(validateForward({ dateFrom: "2024-01-01" })).toEqual({
      ok: true,
      data: {
        endpoint: "range",
        currencyPair: "ALL",
        maturity: "ALL",
        dateFrom: "2024-01-01",
        dateTo: undefined,
      },
    });
  });

  it("routes to range with explicit values", () => {
    expect(
      validateForward({
        dateFrom: "2024-01-01",
        currencyPair: "EUR_TO_CZK",
        maturity: "THREE_MONTH",
        dateTo: "2024-06-01",
      }),
    ).toEqual({
      ok: true,
      data: {
        endpoint: "range",
        currencyPair: "EUR_TO_CZK",
        maturity: "THREE_MONTH",
        dateFrom: "2024-01-01",
        dateTo: "2024-06-01",
      },
    });
  });

  it("routes to daily when only date is provided", () => {
    expect(validateForward({ date: "2024-01-15" })).toEqual({
      ok: true,
      data: { endpoint: "daily", date: "2024-01-15" },
    });
  });

  it("routes to daily with date undefined when nothing is provided", () => {
    expect(validateForward({})).toEqual({
      ok: true,
      data: { endpoint: "daily", date: undefined },
    });
  });
});
