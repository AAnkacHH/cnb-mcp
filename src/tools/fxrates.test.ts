import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerFxratesTools } from "./fxrates.js";

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

describe("registerFxratesTools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockCnbFetch.mockReset();
    server = createMockServer();
    registerFxratesTools(server as never);
  });

  describe("cnb_fx_rates_monthly", () => {
    it("registers the cnb_fx_rates_monthly tool", () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        "cnb_fx_rates_monthly",
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("calls /fxrates/daily-month with yearMonth and lang", async () => {
      const mockData = { rates: [{ currencyCode: "THB" }] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_fx_rates_monthly");
      const result = await handler({ yearMonth: "2024-01", lang: "EN" });

      expect(mockCnbFetch).toHaveBeenCalledWith("/fxrates/daily-month", {
        yearMonth: "2024-01",
        lang: "EN",
      });
      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
      });
    });

    it("calls /fxrates/daily-month with defaults when no params are given", async () => {
      const mockData = { rates: [] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_fx_rates_monthly");
      await handler({});

      expect(mockCnbFetch).toHaveBeenCalledWith("/fxrates/daily-month", {
        yearMonth: undefined,
        lang: undefined,
      });
    });

    it("returns error message when CnbApiError is thrown", async () => {
      mockCnbFetch.mockRejectedValue(
        new CnbApiError(400, "/fxrates/daily-month", "Invalid parameters"),
      );

      const handler = server.getHandler("cnb_fx_rates_monthly");
      const result = await handler({ yearMonth: "2024-01" });

      expect(result).toEqual({
        content: [{ type: "text", text: "Invalid parameters" }],
        isError: true,
      });
    });

    it("returns custom unexpected error message for non-CnbApiError", async () => {
      mockCnbFetch.mockRejectedValue(new Error("network failure"));

      const handler = server.getHandler("cnb_fx_rates_monthly");
      const result = await handler({});

      expect(result).toEqual({
        content: [{ type: "text", text: "Unexpected error while fetching FX rates." }],
        isError: true,
      });
    });
  });

  describe("cnb_fx_rates_currency", () => {
    it("registers the cnb_fx_rates_currency tool", () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        "cnb_fx_rates_currency",
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("calls /fxrates/daily-range-currency with all parameters", async () => {
      const mockData = { rates: [{ currencyCode: "THB", rate: 0.63 }] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_fx_rates_currency");
      const result = await handler({
        currency: "THB",
        yearMonthFrom: "2024-01",
        yearMonthTo: "2024-06",
        lang: "CZ",
      });

      expect(mockCnbFetch).toHaveBeenCalledWith("/fxrates/daily-range-currency", {
        currency: "THB",
        yearMonthFrom: "2024-01",
        yearMonthTo: "2024-06",
        lang: "CZ",
      });
      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
      });
    });

    it("calls with optional params as undefined when not provided", async () => {
      const mockData = { rates: [] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_fx_rates_currency");
      await handler({ currency: "KES" });

      expect(mockCnbFetch).toHaveBeenCalledWith("/fxrates/daily-range-currency", {
        currency: "KES",
        yearMonthFrom: undefined,
        yearMonthTo: undefined,
        lang: undefined,
      });
    });

    it("returns error message when CnbApiError is thrown", async () => {
      mockCnbFetch.mockRejectedValue(
        new CnbApiError(400, "/fxrates/daily-range-currency", "Invalid currency"),
      );

      const handler = server.getHandler("cnb_fx_rates_currency");
      const result = await handler({ currency: "XYZ" });

      expect(result).toEqual({
        content: [{ type: "text", text: "Invalid currency" }],
        isError: true,
      });
    });

    it("returns custom unexpected error message for non-CnbApiError", async () => {
      mockCnbFetch.mockRejectedValue(new Error("timeout"));

      const handler = server.getHandler("cnb_fx_rates_currency");
      const result = await handler({ currency: "THB" });

      expect(result).toEqual({
        content: [{ type: "text", text: "Unexpected error while fetching FX rate history." }],
        isError: true,
      });
    });
  });
});
