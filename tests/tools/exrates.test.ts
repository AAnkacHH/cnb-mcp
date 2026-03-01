import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerExratesTools } from "../../src/tools/exrates.js";
import { createMockServer } from "../helpers/mock-server.js";

vi.mock("../../src/api/client.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../../src/api/client.js")>();
  return { ...original, cnbFetch: vi.fn() };
});

import { cnbFetch, CnbApiError } from "../../src/api/client.js";

const mockCnbFetch = vi.mocked(cnbFetch);

describe("registerExratesTools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockCnbFetch.mockReset();
    server = createMockServer();
    registerExratesTools(server as never);
  });

  describe("cnb_exchange_rates_daily", () => {
    it("registers the tool", () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        "cnb_exchange_rates_daily",
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("calls /exrates/daily with date and lang and returns ok() response", async () => {
      const mockData = {
        rates: [{ currencyCode: "EUR", rate: 25.06, amount: 1, validFor: "2024-01-15" }],
      };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_exchange_rates_daily");
      const result = await handler({ date: "2024-01-15", lang: "EN" });

      expect(mockCnbFetch).toHaveBeenCalledWith("/exrates/daily", {
        date: "2024-01-15",
        lang: "EN",
      });
      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
      });
    });

    it("returns fail() response when CnbApiError is thrown", async () => {
      mockCnbFetch.mockRejectedValue(new CnbApiError(404, "/exrates/daily", "No data available"));

      const handler = server.getHandler("cnb_exchange_rates_daily");
      const result = await handler({ date: "2024-01-15" });

      expect(result).toEqual({
        content: [{ type: "text", text: "No data available" }],
        isError: true,
      });
    });

    it("returns 'Unexpected error' for non-CnbApiError exceptions", async () => {
      mockCnbFetch.mockRejectedValue(new Error("network failure"));

      const handler = server.getHandler("cnb_exchange_rates_daily");
      const result = await handler({});

      expect(result).toEqual({
        content: [{ type: "text", text: "Unexpected error" }],
        isError: true,
      });
    });
  });

  describe("cnb_exchange_rates_monthly", () => {
    it("registers the tool", () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        "cnb_exchange_rates_monthly",
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("calls /exrates/daily-currency-month with currency and yearMonth", async () => {
      const mockData = { rates: [{ currencyCode: "EUR", rate: 25.1 }] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_exchange_rates_monthly");
      const result = await handler({ currency: "EUR", yearMonth: "2024-01" });

      expect(mockCnbFetch).toHaveBeenCalledWith("/exrates/daily-currency-month", {
        currency: "EUR",
        yearMonth: "2024-01",
      });
      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
      });
    });

    it("returns fail() response on API error", async () => {
      mockCnbFetch.mockRejectedValue(
        new CnbApiError(400, "/exrates/daily-currency-month", "Invalid parameters"),
      );

      const handler = server.getHandler("cnb_exchange_rates_monthly");
      const result = await handler({ currency: "EUR" });

      expect(result).toEqual({
        content: [{ type: "text", text: "Invalid parameters" }],
        isError: true,
      });
    });
  });

  describe("cnb_exchange_rates_year", () => {
    it("registers the tool", () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        "cnb_exchange_rates_year",
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("calls /exrates/daily-year with year", async () => {
      const mockData = { rates: [] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_exchange_rates_year");
      const result = await handler({ year: 2024 });

      expect(mockCnbFetch).toHaveBeenCalledWith("/exrates/daily-year", { year: 2024 });
      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
      });
    });

    it("returns fail() response on API error", async () => {
      mockCnbFetch.mockRejectedValue(new CnbApiError(400, "/exrates/daily-year", "Invalid year"));

      const handler = server.getHandler("cnb_exchange_rates_year");
      const result = await handler({ year: 2024 });

      expect(result).toEqual({
        content: [{ type: "text", text: "Invalid year" }],
        isError: true,
      });
    });
  });

  describe("cnb_exchange_rates_monthly_averages (average tool)", () => {
    it("registers the tool", () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        "cnb_exchange_rates_monthly_averages",
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("calls currency endpoint when only currency is provided", async () => {
      const mockData = { averages: [{ currencyCode: "EUR", average: 25.1 }] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_exchange_rates_monthly_averages");
      const result = await handler({ currency: "EUR" });

      expect(mockCnbFetch).toHaveBeenCalledWith("/exrates/monthly-averages-currency", {
        currency: "EUR",
      });
      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
      });
    });

    it("calls year endpoint when only year is provided", async () => {
      const mockData = { averages: [] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_exchange_rates_monthly_averages");
      const result = await handler({ year: 2024 });

      expect(mockCnbFetch).toHaveBeenCalledWith("/exrates/monthly-averages-year", {
        year: 2024,
      });
      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
      });
    });

    it("year takes priority when both currency and year are provided", async () => {
      const mockData = { averages: [] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_exchange_rates_monthly_averages");
      await handler({ currency: "EUR", year: 2024 });

      expect(mockCnbFetch).toHaveBeenCalledWith("/exrates/monthly-averages-year", {
        year: 2024,
      });
    });

    it("returns validation error when neither currency nor year is provided", async () => {
      const handler = server.getHandler("cnb_exchange_rates_monthly_averages");
      const result = await handler({});

      expect(mockCnbFetch).not.toHaveBeenCalled();
      expect(result).toEqual({
        content: [{ type: "text", text: "At least one of 'currency' or 'year' must be provided." }],
        isError: true,
      });
    });

    it("returns fail() response on API error", async () => {
      mockCnbFetch.mockRejectedValue(
        new CnbApiError(400, "/exrates/monthly-averages-currency", "Bad request"),
      );

      const handler = server.getHandler("cnb_exchange_rates_monthly_averages");
      const result = await handler({ currency: "EUR" });

      expect(result).toEqual({
        content: [{ type: "text", text: "Bad request" }],
        isError: true,
      });
    });
  });

  describe("cnb_exchange_rates_quarterly_averages", () => {
    it("registers the tool", () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        "cnb_exchange_rates_quarterly_averages",
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("calls the correct quarterly endpoints", async () => {
      const mockData = { averages: [] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_exchange_rates_quarterly_averages");

      await handler({ currency: "USD" });
      expect(mockCnbFetch).toHaveBeenCalledWith("/exrates/quarterly-averages-currency", {
        currency: "USD",
      });

      mockCnbFetch.mockReset();
      mockCnbFetch.mockResolvedValue(mockData);

      await handler({ year: 2024 });
      expect(mockCnbFetch).toHaveBeenCalledWith("/exrates/quarterly-averages-year", {
        year: 2024,
      });
    });
  });

  describe("cnb_exchange_rates_cumulative_averages", () => {
    it("registers the tool", () => {
      expect(server.registerTool).toHaveBeenCalledWith(
        "cnb_exchange_rates_cumulative_averages",
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("calls the correct cumulative endpoints", async () => {
      const mockData = { averages: [] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_exchange_rates_cumulative_averages");

      await handler({ currency: "GBP" });
      expect(mockCnbFetch).toHaveBeenCalledWith("/exrates/monthly-cumulative-averages-currency", {
        currency: "GBP",
      });

      mockCnbFetch.mockReset();
      mockCnbFetch.mockResolvedValue(mockData);

      await handler({ year: 2023 });
      expect(mockCnbFetch).toHaveBeenCalledWith("/exrates/monthly-cumulative-averages-year", {
        year: 2023,
      });
    });
  });
});
