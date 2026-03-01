import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerConvertTools } from "../../src/tools/convert.js";
import { createMockServer } from "../helpers/mock-server.js";

vi.mock("../../src/api/client.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/api/client.js")>();
  return { ...original, cnbFetch: vi.fn() };
});

import { cnbFetch, CnbApiError } from "../../src/api/client.js";

const mockCnbFetch = vi.mocked(cnbFetch);

describe("registerConvertTools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockCnbFetch.mockReset();
    server = createMockServer();
    registerConvertTools(server as never);
  });

  it("registers the cnb_convert_currency tool", () => {
    expect(server.registerTool).toHaveBeenCalledWith(
      "cnb_convert_currency",
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("returns error without calling API when amount <= 0", async () => {
    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: -10, from: "EUR", to: "CZK" });

    expect(mockCnbFetch).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [{ type: "text", text: "Error: Amount must be greater than zero." }],
      isError: true,
    });
  });

  it("returns error without calling API when amount is 0", async () => {
    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 0, from: "EUR", to: "CZK" });

    expect(mockCnbFetch).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [{ type: "text", text: "Error: Amount must be greater than zero." }],
      isError: true,
    });
  });

  it("returns identity message without calling API when from === to", async () => {
    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 100, from: "EUR", to: "EUR" });

    expect(mockCnbFetch).not.toHaveBeenCalled();
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "100.000 EUR = 100.000 EUR\nNo conversion needed (same currency).",
        },
      ],
    });
  });

  it("converts CZK to EUR correctly", async () => {
    mockCnbFetch.mockResolvedValue({
      rates: [
        {
          currencyCode: "EUR",
          rate: 25.0,
          amount: 1,
          validFor: "2024-01-15",
          order: 1,
          country: "EMU",
          currency: "euro",
        },
      ],
    });

    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 100, from: "CZK", to: "EUR" });

    // 100 CZK / (25.0 / 1) = 4.000 EUR
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "100.000 CZK = 4.000 EUR\nRate: 1 EUR = 25.000 CZK (CNB fixing for 2024-01-15)",
        },
      ],
    });
  });

  it("converts EUR to CZK correctly", async () => {
    mockCnbFetch.mockResolvedValue({
      rates: [
        {
          currencyCode: "EUR",
          rate: 25.0,
          amount: 1,
          validFor: "2024-01-15",
          order: 1,
          country: "EMU",
          currency: "euro",
        },
      ],
    });

    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 100, from: "EUR", to: "CZK" });

    // 100 EUR * (25.0 / 1) = 2,500.000 CZK
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "100.000 EUR = 2,500.000 CZK\nRate: 1 EUR = 25.000 CZK (CNB fixing for 2024-01-15)",
        },
      ],
    });
  });

  it("converts EUR to USD via cross-rate correctly", async () => {
    mockCnbFetch.mockResolvedValue({
      rates: [
        {
          currencyCode: "EUR",
          rate: 25.0,
          amount: 1,
          validFor: "2024-01-15",
          order: 1,
          country: "EMU",
          currency: "euro",
        },
        {
          currencyCode: "USD",
          rate: 23.0,
          amount: 1,
          validFor: "2024-01-15",
          order: 2,
          country: "USA",
          currency: "dollar",
        },
      ],
    });

    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 100, from: "EUR", to: "USD" });

    // Cross-rate: 100 * (25.0/1) / (23.0/1) = 100 * 1.08695... = 108.696 (rounded)
    const crossRate = 25.0 / 23.0;
    const converted = 100 * crossRate;
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: `100.000 EUR = ${converted.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} USD\nRate: 1 EUR = ${crossRate.toFixed(3)} USD (CNB fixing for 2024-01-15)`,
        },
      ],
    });
  });

  it("returns error mentioning cnb_fx_rates_monthly for unknown target currency (CZK to XYZ)", async () => {
    mockCnbFetch.mockResolvedValue({
      rates: [
        {
          currencyCode: "EUR",
          rate: 25.0,
          amount: 1,
          validFor: "2024-01-15",
          order: 1,
          country: "EMU",
          currency: "euro",
        },
      ],
    });

    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 100, from: "CZK", to: "XYZ" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("XYZ");
    expect(result.content[0].text).toContain("cnb_fx_rates_monthly");
  });

  it("returns error mentioning cnb_fx_rates_monthly for unknown source currency (XYZ to CZK)", async () => {
    mockCnbFetch.mockResolvedValue({
      rates: [
        {
          currencyCode: "EUR",
          rate: 25.0,
          amount: 1,
          validFor: "2024-01-15",
          order: 1,
          country: "EMU",
          currency: "euro",
        },
      ],
    });

    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 100, from: "XYZ", to: "CZK" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("XYZ");
    expect(result.content[0].text).toContain("cnb_fx_rates_monthly");
  });

  it("returns error for unknown currency in cross-rate (from side)", async () => {
    mockCnbFetch.mockResolvedValue({
      rates: [
        {
          currencyCode: "EUR",
          rate: 25.0,
          amount: 1,
          validFor: "2024-01-15",
          order: 1,
          country: "EMU",
          currency: "euro",
        },
      ],
    });

    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 100, from: "XYZ", to: "EUR" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("XYZ");
    expect(result.content[0].text).toContain("cnb_fx_rates_monthly");
  });

  it("returns error for unknown currency in cross-rate (to side)", async () => {
    mockCnbFetch.mockResolvedValue({
      rates: [
        {
          currencyCode: "EUR",
          rate: 25.0,
          amount: 1,
          validFor: "2024-01-15",
          order: 1,
          country: "EMU",
          currency: "euro",
        },
      ],
    });

    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 100, from: "EUR", to: "XYZ" });

    expect(result.isError).toBe(true);
    expect(result.content[0].text).toContain("XYZ");
    expect(result.content[0].text).toContain("cnb_fx_rates_monthly");
  });

  it("returns error message when CnbApiError is thrown", async () => {
    mockCnbFetch.mockRejectedValue(
      new CnbApiError(404, "/exrates/daily", "No data available for the specified date"),
    );

    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 100, from: "EUR", to: "CZK" });

    expect(result).toEqual({
      content: [{ type: "text", text: "No data available for the specified date" }],
      isError: true,
    });
  });

  it("returns unexpected error message for non-CnbApiError exceptions", async () => {
    mockCnbFetch.mockRejectedValue(new Error("network failure"));

    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 100, from: "EUR", to: "CZK" });

    expect(result).toEqual({
      content: [{ type: "text", text: "Unexpected error occurred during currency conversion." }],
      isError: true,
    });
  });

  // ---------------------------------------------------------------------------
  // Precision: output must use 3 decimal places (matches CNB API precision)
  // ---------------------------------------------------------------------------

  it("formats output with 3 decimal places for whole numbers", async () => {
    mockCnbFetch.mockResolvedValue({
      rates: [
        { currencyCode: "EUR", rate: 25.0, amount: 1, validFor: "2024-01-15", order: 1, country: "EMU", currency: "euro" },
      ],
    });

    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 50, from: "EUR", to: "CZK" });

    expect(result.content[0].text).toMatch(/^50\.000 EUR = 1,250\.000 CZK/);
  });

  it("formats output with 3 decimal places for fractional results", async () => {
    mockCnbFetch.mockResolvedValue({
      rates: [
        { currencyCode: "EUR", rate: 25.345, amount: 1, validFor: "2024-01-15", order: 1, country: "EMU", currency: "euro" },
      ],
    });

    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 100, from: "CZK", to: "EUR" });

    // 100 / 25.345 = 3.94556...
    expect(result.content[0].text).toMatch(/^100\.000 CZK = 3\.946 EUR/);
  });

  it("formats output with 3 decimal places for cross-rate with real-world rates", async () => {
    mockCnbFetch.mockResolvedValue({
      rates: [
        { currencyCode: "EUR", rate: 25.345, amount: 1, validFor: "2024-01-15", order: 1, country: "EMU", currency: "euro" },
        { currencyCode: "JPY", rate: 15.213, amount: 100, validFor: "2024-01-15", order: 2, country: "Japan", currency: "yen" },
      ],
    });

    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 1000, from: "EUR", to: "JPY" });

    // 1000 * (25.345 / 1) / (15.213 / 100) = 1000 * 25.345 / 0.15213 = 166,601.459...
    const fromRate = 25.345 / 1;
    const toRate = 15.213 / 100;
    const expected = (1000 * fromRate) / toRate;
    expect(result.content[0].text).toMatch(new RegExp(`^1,000\\.000 EUR = ${expected.toFixed(3).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} JPY`));
  });

  it("formats amount with thousands separator and 3 decimal places", async () => {
    mockCnbFetch.mockResolvedValue({
      rates: [
        { currencyCode: "EUR", rate: 25.06, amount: 1, validFor: "2024-01-15", order: 1, country: "EMU", currency: "euro" },
      ],
    });

    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 1000000, from: "EUR", to: "CZK" });

    // 1000000 * 25.06 = 25,060,000.000
    expect(result.content[0].text).toMatch(/^1,000,000\.000 EUR = 25,060,000\.000 CZK/);
  });

  it("same-currency identity also uses 3 decimal places", async () => {
    const handler = server.getHandler("cnb_convert_currency");
    const result = await handler({ amount: 1234.5, from: "USD", to: "USD" });

    expect(result.content[0].text).toContain("1,234.500 USD = 1,234.500 USD");
  });

  it("passes the date parameter to cnbFetch", async () => {
    mockCnbFetch.mockResolvedValue({
      rates: [
        {
          currencyCode: "EUR",
          rate: 25.0,
          amount: 1,
          validFor: "2024-01-15",
          order: 1,
          country: "EMU",
          currency: "euro",
        },
      ],
    });

    const handler = server.getHandler("cnb_convert_currency");
    await handler({ amount: 100, from: "EUR", to: "CZK", date: "2024-01-15" });

    expect(mockCnbFetch).toHaveBeenCalledWith("/exrates/daily", {
      date: "2024-01-15",
      lang: "EN",
    });
  });
});
