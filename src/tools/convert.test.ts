import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerConvertTools } from "./convert.js";

vi.mock("../api/client.js", () => ({
  cnbFetch: vi.fn(),
  CnbApiError: class CnbApiError extends Error {
    constructor(
      public status: number,
      public endpoint: string,
      message: string,
    ) {
      super(message);
      this.name = "CnbApiError";
    }
  },
}));

import { cnbFetch, CnbApiError } from "../api/client.js";

const mockCnbFetch = vi.mocked(cnbFetch);

type ToolHandler = (...args: never[]) => Promise<unknown>;

function createMockServer() {
  const tools = new Map<string, ToolHandler>();
  return {
    registerTool: vi.fn((name: string, _meta: unknown, handler: ToolHandler) => {
      tools.set(name, handler);
    }),
    tool: vi.fn((name: string, _desc: string, _schema: unknown, handler: ToolHandler) => {
      tools.set(name, handler);
    }),
    getHandler(name: string): ToolHandler {
      const h = tools.get(name);
      if (!h) throw new Error(`Tool "${name}" not registered`);
      return h;
    },
  };
}

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
          text: "100.00 EUR = 100.00 EUR\nNo conversion needed (same currency).",
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

    // 100 CZK / (25.0 / 1) = 4.00 EUR
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "100.00 CZK = 4.00 EUR\nRate: 1 EUR = 25.000 CZK (CNB fixing for 2024-01-15)",
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

    // 100 EUR * (25.0 / 1) = 2500.00 CZK
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: "100.00 EUR = 2,500.00 CZK\nRate: 1 EUR = 25.000 CZK (CNB fixing for 2024-01-15)",
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

    // Cross-rate: 100 * (25.0/1) / (23.0/1) = 100 * 1.08695... = 108.70 (rounded)
    const crossRate = 25.0 / 23.0;
    const converted = 100 * crossRate;
    expect(result).toEqual({
      content: [
        {
          type: "text",
          text: `100.00 EUR = ${converted.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ",")} USD\nRate: 1 EUR = ${crossRate.toFixed(3)} USD (CNB fixing for 2024-01-15)`,
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
