import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerPriborTools } from "./pribor.js";
import { createMockServer } from "../tests/mock-server.js";

vi.mock("../api/client.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../api/client.js")>();
  return { ...original, cnbFetch: vi.fn() };
});

import { cnbFetch, CnbApiError } from "../api/client.js";

const mockCnbFetch = vi.mocked(cnbFetch);

describe("registerPriborTools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockCnbFetch.mockReset();
    server = createMockServer();
    registerPriborTools(server as never);
  });

  describe("cnb_pribor_daily", () => {
    it("registers the cnb_pribor_daily tool via server.tool()", () => {
      expect(server.tool).toHaveBeenCalledWith(
        "cnb_pribor_daily",
        expect.any(String),
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("calls cnbFetch with /pribor/daily and the provided date", async () => {
      const mockData = { pribs: [{ validFor: "2024-01-15", period: "ONE_DAY", pribor: 6.95 }] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_pribor_daily");
      const result = await handler({ date: "2024-01-15" });

      expect(mockCnbFetch).toHaveBeenCalledWith("/pribor/daily", { date: "2024-01-15" });
      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
      });
    });

    it("calls cnbFetch with date undefined when no date is provided", async () => {
      const mockData = { pribs: [] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_pribor_daily");
      await handler({ date: undefined });

      expect(mockCnbFetch).toHaveBeenCalledWith("/pribor/daily", { date: undefined });
    });

    it("returns error message when CnbApiError is thrown", async () => {
      mockCnbFetch.mockRejectedValue(new CnbApiError(404, "/pribor/daily", "No data available"));

      const handler = server.getHandler("cnb_pribor_daily");
      const result = await handler({ date: "2024-01-15" });

      expect(result).toEqual({
        content: [{ type: "text", text: "No data available" }],
        isError: true,
      });
    });
  });

  describe("cnb_pribor_year", () => {
    it("registers the cnb_pribor_year tool via server.tool()", () => {
      expect(server.tool).toHaveBeenCalledWith(
        "cnb_pribor_year",
        expect.any(String),
        expect.any(Object),
        expect.any(Function),
      );
    });

    it("calls /pribor/daily-year when no period is provided", async () => {
      const mockData = { pribs: [] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_pribor_year");
      const result = await handler({ year: 2024 });

      expect(mockCnbFetch).toHaveBeenCalledWith("/pribor/daily-year", { year: 2024 });
      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
      });
    });

    it("calls /pribor/daily-year-term when period is provided", async () => {
      const mockData = { pribs: [{ validFor: "2024-01-02", period: "THREE_MONTH", pribor: 6.5 }] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_pribor_year");
      const result = await handler({ year: 2024, period: "THREE_MONTH" });

      expect(mockCnbFetch).toHaveBeenCalledWith("/pribor/daily-year-term", {
        year: 2024,
        period: "THREE_MONTH",
      });
      expect(result).toEqual({
        content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
      });
    });

    it("calls /pribor/daily-year with year undefined when no params are given", async () => {
      const mockData = { pribs: [] };
      mockCnbFetch.mockResolvedValue(mockData);

      const handler = server.getHandler("cnb_pribor_year");
      await handler({});

      expect(mockCnbFetch).toHaveBeenCalledWith("/pribor/daily-year", { year: undefined });
    });

    it("returns error message when CnbApiError is thrown", async () => {
      mockCnbFetch.mockRejectedValue(
        new CnbApiError(400, "/pribor/daily-year-term", "Invalid parameters"),
      );

      const handler = server.getHandler("cnb_pribor_year");
      const result = await handler({ year: 2024, period: "THREE_MONTH" });

      expect(result).toEqual({
        content: [{ type: "text", text: "Invalid parameters" }],
        isError: true,
      });
    });
  });
});
