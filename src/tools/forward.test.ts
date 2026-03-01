import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerForwardTools } from "./forward.js";
import { createMockServer } from "../tests/mock-server.js";

vi.mock("../api/client.js", async (importOriginal) => {
  const original = await importOriginal<typeof import("../api/client.js")>();
  return { ...original, cnbFetch: vi.fn() };
});

import { cnbFetch, CnbApiError } from "../api/client.js";

const mockCnbFetch = vi.mocked(cnbFetch);

describe("registerForwardTools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockCnbFetch.mockReset();
    server = createMockServer();
    registerForwardTools(server as never);
  });

  it("registers the cnb_forward_rates tool", () => {
    expect(server.registerTool).toHaveBeenCalledWith(
      "cnb_forward_rates",
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("calls range endpoint with defaults ALL/ALL when dateFrom is provided", async () => {
    const mockData = { forwardPoints: [] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_forward_rates");
    const result = await handler({ dateFrom: "2024-01-01" });

    expect(mockCnbFetch).toHaveBeenCalledWith("/forward/daily-range-currency-pair-maturity", {
      currencyPair: "ALL",
      dateFrom: "2024-01-01",
      dateTo: undefined,
      maturity: "ALL",
    });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
    });
  });

  it("passes explicit filters when dateFrom is provided with currencyPair and maturity", async () => {
    const mockData = { forwardPoints: [{ ccyPair: "EUR_TO_CZK" }] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_forward_rates");
    await handler({
      dateFrom: "2024-01-01",
      dateTo: "2024-01-31",
      currencyPair: "EUR_TO_CZK",
      maturity: "THREE_MONTH",
    });

    expect(mockCnbFetch).toHaveBeenCalledWith("/forward/daily-range-currency-pair-maturity", {
      currencyPair: "EUR_TO_CZK",
      dateFrom: "2024-01-01",
      dateTo: "2024-01-31",
      maturity: "THREE_MONTH",
    });
  });

  it("calls /forward/daily with date when dateFrom is not provided", async () => {
    const mockData = { forwardPoints: [] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_forward_rates");
    const result = await handler({ date: "2024-01-15" });

    expect(mockCnbFetch).toHaveBeenCalledWith("/forward/daily", { date: "2024-01-15" });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
    });
  });

  it("calls /forward/daily with date undefined when no params are given", async () => {
    const mockData = { forwardPoints: [] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_forward_rates");
    await handler({});

    expect(mockCnbFetch).toHaveBeenCalledWith("/forward/daily", { date: undefined });
  });

  it("returns error message when CnbApiError is thrown", async () => {
    mockCnbFetch.mockRejectedValue(new CnbApiError(404, "/forward/daily", "No data available"));

    const handler = server.getHandler("cnb_forward_rates");
    const result = await handler({ date: "2024-01-15" });

    expect(result).toEqual({
      content: [{ type: "text", text: "No data available" }],
      isError: true,
    });
  });

  it("returns 'Unexpected error' for non-CnbApiError exceptions", async () => {
    mockCnbFetch.mockRejectedValue(new Error("network error"));

    const handler = server.getHandler("cnb_forward_rates");
    const result = await handler({ date: "2024-01-15" });

    expect(result).toEqual({
      content: [{ type: "text", text: "Unexpected error" }],
      isError: true,
    });
  });
});
