import { describe, it, expect, vi, beforeEach } from "vitest";
import { registerCzeoniaTools } from "./czeonia.js";

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

describe("registerCzeoniaTools", () => {
  let server: ReturnType<typeof createMockServer>;

  beforeEach(() => {
    mockCnbFetch.mockReset();
    server = createMockServer();
    registerCzeoniaTools(server as never);
  });

  it("registers the cnb_czeonia tool", () => {
    expect(server.registerTool).toHaveBeenCalledWith(
      "cnb_czeonia",
      expect.any(Object),
      expect.any(Function),
    );
  });

  it("calls /czeonia/daily-year when year is provided", async () => {
    const mockData = { rates: [{ validFor: "2024-01-02", rate: 7.05, volumeInCZKmio: 100 }] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_czeonia");
    const result = await handler({ year: 2024 });

    expect(mockCnbFetch).toHaveBeenCalledWith("/czeonia/daily-year", { year: 2024 });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
    });
  });

  it("calls /czeonia/daily when only date is provided", async () => {
    const mockData = { czeoniaDaily: { validFor: "2024-01-15", rate: 7.05, volumeInCZKmio: 100 } };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_czeonia");
    const result = await handler({ date: "2024-01-15" });

    expect(mockCnbFetch).toHaveBeenCalledWith("/czeonia/daily", { date: "2024-01-15" });
    expect(result).toEqual({
      content: [{ type: "text", text: JSON.stringify(mockData, null, 2) }],
    });
  });

  it("year takes priority when both date and year are provided", async () => {
    const mockData = { rates: [] };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_czeonia");
    await handler({ date: "2024-01-15", year: 2024 });

    expect(mockCnbFetch).toHaveBeenCalledWith("/czeonia/daily-year", { year: 2024 });
  });

  it("calls /czeonia/daily with date undefined when no params are given", async () => {
    const mockData = { czeoniaDaily: { validFor: "2024-01-15", rate: 7.05, volumeInCZKmio: 100 } };
    mockCnbFetch.mockResolvedValue(mockData);

    const handler = server.getHandler("cnb_czeonia");
    await handler({});

    expect(mockCnbFetch).toHaveBeenCalledWith("/czeonia/daily", { date: undefined });
  });

  it("returns error message when CnbApiError is thrown", async () => {
    mockCnbFetch.mockRejectedValue(new CnbApiError(404, "/czeonia/daily", "No data available"));

    const handler = server.getHandler("cnb_czeonia");
    const result = await handler({ date: "2024-01-15" });

    expect(result).toEqual({
      content: [{ type: "text", text: "No data available" }],
      isError: true,
    });
  });
});
