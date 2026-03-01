import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerOmoTools } from "./omo.js";

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

describe("registerOmoTools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockCnbFetch.mockReset();
    server = createMockServer();
    registerOmoTools(server as never);
  });

  it("registers the cnb_open_market_operations tool", () => {
    expect(server.registerTool).toHaveBeenCalledWith(
      "cnb_open_market_operations",
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("calls /omo/daily-year when year is provided", async () => {
    const mockData = { operations: [] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_open_market_operations");
    const result = await handler({ year: 2024 });

    expect(mockCnbFetch).toHaveBeenCalledWith("/omo/daily-year", { year: 2024 });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
    });
  });

  it("calls /omo/daily when only date is provided", async () => {
    const mockData = { operations: [{ operationType: "REPO" }] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_open_market_operations");
    const result = await handler({ date: "2024-01-15" });

    expect(mockCnbFetch).toHaveBeenCalledWith("/omo/daily", { date: "2024-01-15" });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
    });
  });

  it("year takes priority when both date and year are provided", async () => {
    const mockData = { operations: [] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_open_market_operations");
    await handler({ date: "2024-01-15", year: 2024 });

    expect(mockCnbFetch).toHaveBeenCalledWith("/omo/daily-year", { year: 2024 });
  });

  it("calls /omo/daily with date undefined when no params are given", async () => {
    const mockData = { operations: [] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_open_market_operations");
    await handler({});

    expect(mockCnbFetch).toHaveBeenCalledWith("/omo/daily", { date: undefined });
  });

  it("returns error message when CnbApiError is thrown", async () => {
    mockCnbFetch.mockRejectedValue(new CnbApiError(404, "/omo/daily", "No data available"));

    const handler = server.getHandler("cnb_open_market_operations");
    const result = await handler({ date: "2024-01-15" });

    expect(result).toEqual({
      content: [{ type: "text", text: "No data available" }],
      isError: true,
    });
  });

  it("returns 'Unexpected error' for non-CnbApiError exceptions", async () => {
    mockCnbFetch.mockRejectedValue(new Error("something went wrong"));

    const handler = server.getHandler("cnb_open_market_operations");
    const result = await handler({ date: "2024-01-15" });

    expect(result).toEqual({
      content: [{ type: "text", text: "Unexpected error" }],
      isError: true,
    });
  });
});
